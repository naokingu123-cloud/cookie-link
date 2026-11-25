#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <random>
#include <stdexcept>
#include <string>
#include <vector>

// Independent simulation of the complete rule, with no play-length cap.
// Pocket indices 0/5/10/15/20 are JP / add1 / add2 / add3 / add4.
// C++17 standard library only; this program does not run the physical roulette.
// Same-seed bitwise reproduction requires the same uniform_int_distribution
// implementation (the recorded evidence was produced with GNU libstdc++).
int main(int argc, char** argv) {
    if (argc != 7) {
        std::cerr << "usage: simulate_jpc runs seed b1 b2 b3 b4\n";
        return 2;
    }
    uint64_t runs, seed;
    std::array<int, 4> boosts{};
    try {
        auto parse = [](const char* value) {
            const std::string text(value);
            if(text.empty() || text.front()=='-') throw std::invalid_argument("negative/empty argument");
            size_t used=0;
            const uint64_t number=std::stoull(text,&used);
            if(used!=text.size()) throw std::invalid_argument("non-integer argument");
            return number;
        };
        runs=parse(argv[1]); seed=parse(argv[2]);
        if(runs<2) throw std::invalid_argument("at least two trials are required");
        int sum=0;
        for(size_t i=0;i<boosts.size();i++) {
            const uint64_t value=parse(argv[i+3]);
            if(value>=25) throw std::invalid_argument("bonus must be below 25");
            boosts[i]=static_cast<int>(value); sum+=boosts[i];
        }
        if(sum>=25) throw std::invalid_argument("sum of bonuses must be below 25");
    } catch(const std::exception& error) {
        std::cerr<<error.what()<<"\n"; return 2;
    }
    std::mt19937_64 engine(seed);
    std::uniform_int_distribution<int> pocket(0,24);
    const std::array<int,9> pay = {0,1,2,3,4,6,8,10,15};
    long double sumP=0,sumP2=0,sumS=0,sumJ=0,sumT=0,jpSum=0,noJpSum=0;
    uint64_t jpRuns=0,maxT=0,maxP=0;
    std::vector<uint64_t> histT(100),histP(100),histJ(10);
    for (uint64_t r=0;r<runs;r++) {
        std::array<uint32_t,25> hits{};
        int64_t bank=30;
        uint64_t t=0;
        while (bank>0) {
            bank--; t++;
            const int p=pocket(engine);
            hits[p]++;
            if (p>0 && p%5==0) bank+=boosts[p/5-1];
        }
        uint64_t s=0;
        for (int p=0;p<25;p++) if(p%5) s+=pay[std::min(uint32_t(8),hits[p])];
        const uint64_t j=hits[0];
        const uint64_t amount=s*(j<5?1:5*(j-4));
        sumP+=amount; sumP2+=static_cast<long double>(amount)*amount;
        sumS+=s; sumJ+=j; sumT+=t;
        if(j>=5) {jpRuns++;jpSum+=amount;} else noJpSum+=amount;
        if(t>maxT)maxT=t;
        if(amount>maxP)maxP=amount;
        if(t>=histT.size())histT.resize(t+1);
        if(amount>=histP.size())histP.resize(amount+1);
        if(j>=histJ.size())histJ.resize(j+1);
        histT[t]++;histP[amount]++;histJ[j]++;
    }
    auto q = [runs](const std::vector<uint64_t>& hist,double fraction){
        const uint64_t rank=std::ceil(runs*fraction); uint64_t count=0;
        for(size_t i=0;i<hist.size();i++){count+=hist[i];if(count>=rank)return i;}
        return hist.size()-1;
    };
    auto tail = [runs](const std::vector<uint64_t>& hist,uint64_t from){
        uint64_t count=0;for(size_t i=from;i<hist.size();i++)count+=hist[i];return double(count)/runs;
    };
    const long double mean=sumP/runs;
    const long double se=std::sqrt((sumP2-runs*mean*mean)/(runs-1)/runs);
    std::cout<<std::setprecision(14)<<"{\n";
    std::cout<<"\"runs\":"<<runs<<",\n\"seed\":"<<seed<<",\n\"generator\":\"std::mt19937_64/uniform_int_distribution(0,24)\",\n";
    std::cout<<"\"boosts\":["<<boosts[0]<<","<<boosts[1]<<","<<boosts[2]<<","<<boosts[3]<<"],\n";
    std::cout<<"\"pocket_count\":25,\n\"initial_balls\":30,\n\"pocket_payouts\":[0,1,2,3,4,6,8,10,15],\n\"jp_threshold\":5,\n\"jp_multiplier_step\":5,\n\"has_draw_limit\":false,\n";
    std::cout<<"\"expected_payout_estimate\":"<<mean<<",\n\"standard_error\":"<<se<<",\n";
    std::cout<<"\"ci95\":["<<mean-1.96L*se<<","<<mean+1.96L*se<<"],\n";
    std::cout<<"\"mean_base\":"<<sumS/runs<<",\n\"mean_balls\":"<<sumT/runs<<",\n\"mean_jp_hits\":"<<sumJ/runs<<",\n";
    std::cout<<"\"jp_probability\":"<<static_cast<double>(jpRuns)/runs<<",\n";
    std::cout<<"\"conditional_jp_payout\":";
    if(jpRuns)std::cout<<jpSum/jpRuns;else std::cout<<"null";
    std::cout<<",\n\"conditional_no_jp_payout\":";
    if(runs>jpRuns)std::cout<<noJpSum/(runs-jpRuns);else std::cout<<"null";
    std::cout<<",\n";
    std::cout<<"\"max_balls\":"<<maxT<<",\n\"max_payout\":"<<maxP<<",\n\"quantiles\":[";
    bool first=true;
    for(const double fraction:{0.5,0.75,0.9,0.95,0.99,0.999}){
        if(!first)std::cout<<",";
        first=false;
        std::cout<<"{\"p\":"<<fraction<<",\"balls\":"<<q(histT,fraction)<<",\"payout\":"<<q(histP,fraction)<<"}";
    }
    std::cout<<"],\n\"tail_probabilities\":{\"balls_above_100\":"<<tail(histT,101)<<",\"balls_above_200\":"<<tail(histT,201)<<",\"balls_above_500\":"<<tail(histT,501)<<",\"payout_at_least_1000\":"<<tail(histP,1000)<<",\"payout_at_least_5000\":"<<tail(histP,5000)<<",\"payout_at_least_10000\":"<<tail(histP,10000)<<"},\n";
    std::cout<<"\"jp_hit_histogram\":[";
    for(size_t i=0;i<histJ.size();i++){if(i)std::cout<<",";std::cout<<histJ[i];}
    std::cout<<"]\n}\n";
}
