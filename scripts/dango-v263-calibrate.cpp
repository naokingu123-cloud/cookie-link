// Dango v263 independent integer calibration and cross-language fixtures.
// Build: c++ -O3 -std=c++17 scripts/dango-v263-calibrate.cpp -o /tmp/dango-v263-calibrate
// Run:   /tmp/dango-v263-calibrate > docs/dango-v263-independent.json
// Production calibration uses the frequency-balanced 5,000x jackpot and fixed 3/200 mix.
// The companion layout-search program accepts --jackpot 20000 for historical proofs.
// No game JavaScript is imported: geometry, payout events and final rounds are
// independently reconstructed below. A round's first five and last three sets
// have C(25,5)*C(20,3) = 60,568,200 equiprobable possibilities.
#include <algorithm>
#include <array>
#include <cassert>
#include <cmath>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <limits>
#include <numeric>
#include <string>
#include <vector>

using Mask = std::uint32_t;
using Integer = std::int64_t;
using Table = std::array<std::array<Integer,4>,5>;
constexpr Integer EARLY_SETS = 53130, LATE_SETS = 1140;
constexpr Integer DRAW_SPACE = EARLY_SETS * LATE_SETS;
// Legal center counts: 23 for levels 1/3; 5 through 10 for level 2.
constexpr Integer CENTER_LCM = 57960;
constexpr Mask ALL = (Mask(1) << 28) - 1;
Table CANDIDATE = {{{0,20,80,1200},{0,30,120,600},{0,40,400,3000},
                          {0,100,2000,20000},{0,200,5000,500000}}};
Table REQUESTED = {{{0,40,200,5000},{0,200,1000,5000},{0,500,2500,20000},
                          {0,1000,10000,50000},{0,3000,25000,200000}}};
Integer jackpotHundredths=500000;
void configureJackpot(int argc,char**argv){
  for(int i=1;i<argc;i++){
    const std::string arg=argv[i];
    if(arg=="--jackpot"){
      if(++i>=argc)throw std::invalid_argument("--jackpot requires an integer multiplier");
      const Integer multiplier=std::stoll(argv[i]);
      if(multiplier<0||multiplier>20000)throw std::invalid_argument("jackpot must be between 0 and 20000");
      jackpotHundredths=multiplier*100;
    }else if(arg!="--all"&&arg!="--zero-bound")throw std::invalid_argument("unknown argument: "+arg);
  }
  CANDIDATE[4][3]=REQUESTED[4][3]=jackpotHundredths;
}
int popcount(Mask m) { return __builtin_popcount(m); }
Mask bit(int id) { return Mask(1) << id; }
Mask mask(const std::vector<int>& ids) { Mask m=0; for(int i:ids)m|=bit(i); return m; }
std::vector<int> ids(Mask m) { std::vector<int> v; for(int i=0;i<28;i++)if(m&bit(i))v.push_back(i);return v; }

struct Cell { int row, col; };
struct Geometry {
  std::array<Cell,28> cells{};
  std::array<std::array<Mask,3>,5> lines{};
  std::array<std::array<Mask,8>,5> unions{};
  std::array<std::array<Mask,28>,4> regions{};
  Mask interior=0;
  Geometry() {
    int id=0;
    for(int r=0;r<7;r++)for(int c=0;c<=r;c++)cells[id++]={r,c};
    const auto distance=[&](int i,int j){
      auto a=cells[i],b=cells[j];
      return std::max({std::abs(a.row-b.row),std::abs(a.col-b.col),
                       std::abs(a.row-a.col-b.row+b.col)});
    };
    for(int i=0;i<28;i++){
      regions[1][i]=bit(i);
      std::vector<int> neighbors;
      Mask six=bit(i);
      for(int j=0;j<28;j++)if(j!=i){neighbors.push_back(j);if(distance(i,j)==1)six|=bit(j);}
      if(popcount(six)==7){interior|=bit(i);regions[2][i]=six;}
      std::sort(neighbors.begin(),neighbors.end(),[&](int a,int b){
        if(distance(i,a)!=distance(i,b))return distance(i,a)<distance(i,b);
        return (a*13+i*7)%29<(b*13+i*7)%29;
      });
      Mask seventeen=bit(i);for(int n=0;n<16;n++)seventeen|=bit(neighbors[n]);
      regions[3][i]=seventeen;
    }
    std::array<int,5> count{};
    for(int axis=0;axis<3;axis++)for(int v=0;v<7;v++){
      Mask line=0;
      for(int i=0;i<28;i++){
        auto c=cells[i];int key=axis==0?c.row:axis==1?c.col:c.row-c.col;
        if(key==v)line|=bit(i);
      }
      int length=popcount(line);
      if(length>=3){assert(count[length-3]<3);lines[length-3][count[length-3]++]=line;}
    }
    for(int c:count)assert(c==3);
    for(int l=0;l<5;l++)for(int sub=1;sub<8;sub++)for(int j=0;j<3;j++)
      if(sub&bit(j))unions[l][sub]|=lines[l][j];
    assert(popcount(interior)==10);
  }
  Mask centers(Mask early,int level)const {
    return level ? (ALL&~early)&(level==2?interior:ALL) : 0;
  }
};
const Geometry GEO;

// Numerator of the conditional mean payout (hundredths of BET), with denominator
// C(20,3)=1140. Missing line numbers are disjoint from new FREE numbers. Therefore
// each required m-number event has exactly:
//   a*C(20-m,3-m) + q*C(19-m,2-m)
// ODDS-weighted late sets, where a=1+overlapped initial FREE and q=new FREE numbers.
// P(N=n) is reconstructed from the 3 single/3 pair/1 triple line-union moments.
Integer score(Mask free,Mask early,Mask footprint,const Table& table) {
  const Mask marked=free|early|footprint;
  const int a=1+popcount(free&footprint),q=popcount(footprint&~(free|early));
  const std::array<Integer,4> weighted={1140*a+171*q,171*a+18*q,18*a+q,a};
  Integer total=0;
  for(int l=0;l<5;l++){
    const auto& p=table[l];
    const std::array<Integer,4> coefficient={0,p[1],p[2]-2*p[1],p[3]-3*p[2]+3*p[1]};
    for(int subset=1;subset<8;subset++){
      Mask u=GEO.unions[l][subset];
      int missing=popcount(u&~marked);
      if(missing<=3)total+=coefficient[popcount(Mask(subset))]*weighted[missing];
    }
  }
  return total;
}
struct Best { int center=-1; Integer numerator=0; };
Best bestCenter(Mask free,Mask early,int level,const Table& table) {
  if(!level)return {-1,score(free,early,0,table)};
  Best best{-1,-1};
  for(int c:ids(GEO.centers(early,level))){
    Integer s=score(free,early,GEO.regions[level][c],table);
    if(s>best.numerator)best={c,s}; // Deterministic smallest-cell-ID tie break.
  }
  assert(best.center>=0);return best;
}
struct Profile { std::string id;std::vector<int> free,trigger; };
const std::array<Profile,3> PROFILES={{{"triangle-edge",{0,20,22},{8,11,12}},
                                    {"triangle-festival",{6,9,24},{10,23,25}},
                                    {"triangle-jackpot",{0,2,21},{3,10,15}}}};
// Reserve a draw-independent 1.5% for a layout on which optimal AUTO can
// actually complete all three 7-cell lines. The other two weights remain
// adjustable across the complete requested 50--150% range.
constexpr Integer JACKPOT_WEIGHT_NUMERATOR=3, JACKPOT_WEIGHT_DENOMINATOR=200;
std::uint32_t hash32(std::uint32_t x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return x;}
struct Sample { bool set=false;Mask early=0;Integer score=0;std::uint32_t key=0; };
struct Result {
  Integer total=0,randomScaledTotal=0;
  Integer jackpotOutcomeCount=0,jackpotOddsWeightedCount=0;
  std::array<Integer,4> byLevel{},count{};
  std::array<std::array<Sample,4>,4> samples{};
};
Result enumerate(const Profile& p,const Table& table) {
  const Mask free=mask(p.free),trigger=mask(p.trigger);
  const auto pool=ids(ALL&~free);assert(pool.size()==25);
  Result result;
  for(int a=0;a<21;a++)for(int b=a+1;b<22;b++)for(int c=b+1;c<23;c++)
  for(int d=c+1;d<24;d++)for(int e=d+1;e<25;e++){
    Mask early=bit(pool[a])|bit(pool[b])|bit(pool[c])|bit(pool[d])|bit(pool[e]);
    int level=popcount(early&trigger);auto best=bestCenter(free,early,level,table);
    result.total+=best.numerator;result.byLevel[level]+=best.numerator;result.count[level]++;
    const Mask chosenFootprint=level?GEO.regions[level][best.center]:0;
    const int jackpotMissing=popcount(GEO.unions[4][7]&~(free|early|chosenFootprint));
    if(jackpotMissing<=3){
      const std::array<Integer,4> completions={1140,171,18,1},extraOdds={171,18,1,0};
      const int odds=1+popcount(free&chosenFootprint),q=popcount(chosenFootprint&~(free|early));
      result.jackpotOutcomeCount+=completions[jackpotMissing];
      result.jackpotOddsWeightedCount+=odds*completions[jackpotMissing]+q*extraOdds[jackpotMissing];
    }
    Integer averageNumerator=0;
    if(!level)averageNumerator=best.numerator*CENTER_LCM;
    else{
      Mask choices=GEO.centers(early,level);int n=popcount(choices);assert(CENTER_LCM%n==0);
      for(int center:ids(choices))averageNumerator+=score(free,early,GEO.regions[level][center],table)*(CENTER_LCM/n);
    }
    result.randomScaledTotal+=averageNumerator;
    auto& s=result.samples[level];
    if(!s[0].set||best.numerator>s[0].score)s[0]={true,early,best.numerator,0};
    if(!s[1].set||best.numerator<s[1].score)s[1]={true,early,best.numerator,0};
    for(int variant=2;variant<4;variant++){
      auto key=hash32(early^(0x9e3779b9u*std::uint32_t(variant)));
      if(!s[variant].set||key<s[variant].key)s[variant]={true,early,best.numerator,key};
    }
  }
  assert(std::accumulate(result.count.begin(),result.count.end(),Integer(0))==EARLY_SETS);
  assert((result.count==std::array<Integer,4>{26334,21945,4620,231}));
  return result;
}
struct Round { int odds=1;Integer payout=0;std::array<int,5> counts{}; };
Round finish(Mask free,Mask early,Mask footprint,Mask late,const Table& table){
  Round r;r.odds=1+popcount(free&footprint)+popcount(late&footprint);
  Mask marked=free|early|footprint|late;
  for(int l=0;l<5;l++){
    for(Mask line:GEO.lines[l])if((line&marked)==line)r.counts[l]++;
    r.payout+=table[l][r.counts[l]];
  }
  r.payout*=r.odds;return r;
}
void list(const std::vector<int>& values){std::cout<<'[';for(std::size_t i=0;i<values.size();i++){if(i)std::cout<<',';std::cout<<values[i];}std::cout<<']';}
void integerList(const std::array<Integer,4>& values){std::cout<<'[';for(int i=0;i<4;i++){if(i)std::cout<<',';std::cout<<values[i];}std::cout<<']';}
std::vector<int> numbersFor(const Profile&p){std::vector<int>n(28,0);int number=1;Mask f=mask(p.free);for(int i=0;i<28;i++)if(!(f&bit(i)))n[i]=number++;return n;}
std::vector<int> mapped(Mask m,const std::vector<int>&n){auto v=ids(m);for(int&i:v)i=n[i];return v;}
Mask chooseLate(Mask remaining,Mask footprint,Mask free,Mask early,int variant){
  auto pool=ids(remaining);assert(pool.size()==20);
  if(variant==0){
    Mask best=0;Integer reward=-1;
    for(int i=0;i<18;i++)for(int j=i+1;j<19;j++)for(int k=j+1;k<20;k++){
      Mask late=bit(pool[i])|bit(pool[j])|bit(pool[k]);Integer v=finish(free,early,footprint,late,CANDIDATE).payout;
      if(v>reward){reward=v;best=late;}
    }
    return best;
  }
  std::stable_sort(pool.begin(),pool.end(),[&](int a,int b){
    bool aa=footprint&bit(a),bb=footprint&bit(b);
    if(aa!=bb)return variant==2?aa>bb:aa<bb;
    return a<b;
  });
  Mask late=0;
  if(variant==3){for(int i:pool)if(footprint&bit(i)){late|=bit(i);break;}}
  for(int i:pool){if(popcount(late)==3)break;late|=bit(i);}
  assert(popcount(late)==3);return late;
}
void emitVector(int profileIndex,int level,int variant,const Sample& sample){
  const auto&p=PROFILES[profileIndex];Mask free=mask(p.free),early=sample.early;
  auto best=bestCenter(free,early,level,CANDIDATE);int center=best.center;
  if(level&&variant==2){
    // Explicit manual placement onto an existing FREE: verify overlap ODDS and
    // legal center selection independently of the automatic best center.
    int overlap=-1;
    for(int c:ids(GEO.centers(early,level)&free)){
      int n=popcount(GEO.regions[level][c]&free);if(n>overlap){center=c;overlap=n;}
    }
  }
  if(level&&variant==3){
    int overlap=-1;
    for(int c:ids(GEO.centers(early,level))){
      int n=popcount(GEO.regions[level][c]&free);if(n>overlap){center=c;overlap=n;}
    }
  }
  Mask footprint=level?GEO.regions[level][center]:0;
  Mask late=chooseLate(ALL&~(free|early),footprint,free,early,(level==3&&variant==3)?2:variant);
  auto numbers=numbersFor(p);auto final=finish(free,early,footprint,late,CANDIDATE);
  std::cout<<"{\"id\":\"m"<<profileIndex<<"-k"<<level<<"-v"<<variant<<"\",\"moldIndex\":"<<profileIndex<<",\"activationCount\":"<<level;
  std::cout<<",\"numbers\":";list(numbers);std::cout<<",\"firstFiveNumbers\":";list(mapped(early,numbers));
  std::cout<<",\"lateNumbers\":";list(mapped(late,numbers));
  std::cout<<",\"bestCenter\":";if(best.center<0)std::cout<<"null";else std::cout<<best.center;
  std::cout<<",\"bestExpectedNumerator\":"<<best.numerator<<",\"center\":";if(center<0)std::cout<<"null";else std::cout<<center;
  std::cout<<",\"centerExpectedNumerator\":"<<score(free,early,footprint,CANDIDATE)<<",\"allCenterNumerators\":[";
  bool comma=false;
  if(!level)std::cout<<"{\"center\":null,\"numerator\":"<<best.numerator<<'}';
  else for(int c:ids(GEO.centers(early,level))){if(comma)std::cout<<',';comma=true;std::cout<<"{\"center\":"<<c<<",\"numerator\":"<<score(free,early,GEO.regions[level][c],CANDIDATE)<<'}';}
  std::cout<<"],\"footprint\":";list(ids(footprint));std::cout<<",\"initialFreeOverlap\":";list(ids(footprint&free));
  std::cout<<",\"lateOddsHitNumbers\":";list(mapped(footprint&late,numbers));
  std::cout<<",\"finalOdds\":"<<final.odds<<",\"lineCounts\":[";
  for(int i=0;i<5;i++){if(i)std::cout<<',';std::cout<<final.counts[i];}
  std::cout<<"],\"payoutHundredths\":"<<final.payout<<'}';
}
void table(const Table&t){std::cout<<'[';for(int l=0;l<5;l++){if(l)std::cout<<',';std::cout<<'[';for(int n=1;n<4;n++){if(n>1)std::cout<<',';std::cout<<t[l][n];}std::cout<<']';}std::cout<<']';}
#ifndef DANGO_V262_CALIBRATION_LIBRARY
int main(int argc,char**argv){
  configureJackpot(argc,argv);
  std::cout<<std::setprecision(17);
  std::array<Result,PROFILES.size()> results;
  for(std::size_t i=0;i<PROFILES.size();i++)results[i]=enumerate(PROFILES[i],CANDIDATE);
  const Profile minOptimal={"original-global-min-optimal",{20,21,22},{8,12,17}};
  const Profile minRandom={"original-global-min-random",{0,20,26},{8,11,12}};
  auto originalOptimal=enumerate(minOptimal,REQUESTED),originalRandom=enumerate(minRandom,REQUESTED);
  std::cout<<"{\n\"schemaVersion\":1,\"rulesRevision\":263,\"status\":\"approved-for-production\",\n";
  std::cout<<"\"jackpotMultiplier\":"<<jackpotHundredths/100<<",\n";
  std::cout<<"\"model\":{\"rows\":[1,2,3,4,5,6,7],\"cellCount\":28,\"numberCount\":25,\"initialFreeCount\":3,\"triggerCount\":3,\"firstDrawCount\":5,\"finalDrawCount\":3,\"expansionSizes\":[0,1,7,17],\"lineLengths\":[3,4,5,6,7],\"linesPerLength\":3,\"centerMayOverlapInitialFree\":true,\"centerMayOverlapFirstFiveHit\":false,\"odds\":\"1 + initial FREE sites covered by the expansion + final-three hits on the expansion\",\"nearest16TieRule\":\"hex distance, then (neighborId*13+centerId*7)%29\",\"placementPolicy\":\"maximum exact conditional expected payout after first five; smallest ID wins ties\",\"draws\":\"uniform without replacement\",\"includesSugar\":false,\"includesCreditRounding\":false},\n";
  std::cout<<"\"requestedPaytableHundredths\":";table(REQUESTED);std::cout<<",\"candidatePaytableHundredths\":";table(CANDIDATE);
  std::cout<<",\n\"integerMethod\":{\"earlySets\":"<<EARLY_SETS<<",\"lateSets\":"<<LATE_SETS<<",\"drawSpaceDenominator\":"<<DRAW_SPACE<<",\"centerCountLcm\":"<<CENTER_LCM<<",\"eventCounts\":[1140,171,18,1],\"extraOddsCounts\":[171,18,1,0],\"lineUnionCount\":35},\n\"profiles\":[";
  for(std::size_t i=0;i<PROFILES.size();i++){
    if(i)std::cout<<',';const auto&p=PROFILES[i];const auto&r=results[i];
    std::cout<<"{\"id\":\""<<p.id<<"\",\"initialFreeCells\":";list(p.free);std::cout<<",\"triggerCells\":";list(p.trigger);
    std::cout<<",\"optimalNumerator\":"<<r.total<<",\"denominator\":"<<DRAW_SPACE<<",\"optimalReturnPercent\":"<<double(r.total)/DRAW_SPACE;
    std::cout<<",\"randomNumerator\":"<<r.randomScaledTotal<<",\"randomDenominator\":"<<DRAW_SPACE*CENTER_LCM<<",\"randomReturnPercent\":"<<double(r.randomScaledTotal)/(DRAW_SPACE*CENTER_LCM);
    std::cout<<",\"jackpotOutcomeCount\":"<<r.jackpotOutcomeCount<<",\"jackpotOddsWeightedCount\":"<<r.jackpotOddsWeightedCount<<",\"jackpotProbability\":"<<double(r.jackpotOutcomeCount)/DRAW_SPACE;
    std::cout<<",\"activationSetCounts\":";integerList(r.count);std::cout<<",\"activationOptimalNumerators\":";integerList(r.byLevel);std::cout<<'}';
  }
  const Integer low=results[0].total,high=results[1].total,jackpot=results[2].total,delta=high-low;
  const Integer fixedN=JACKPOT_WEIGHT_NUMERATOR,fixedD=JACKPOT_WEIGHT_DENOMINATOR;
  const Integer remainingN=fixedD-fixedN,weightD=fixedD*delta,jn=fixedN*delta;
  assert(remainingN*low+fixedN*jackpot<50*DRAW_SPACE*fixedD);
  assert(remainingN*high+fixedN*jackpot>150*DRAW_SPACE*fixedD);
  assert(results[2].jackpotOutcomeCount>0);
  const Integer jackpotProbabilityN=fixedN*results[2].jackpotOutcomeCount,jackpotProbabilityD=fixedD*DRAW_SPACE;
  const Integer probabilityGcd=std::gcd(jackpotProbabilityN,jackpotProbabilityD);
  std::cout<<"],\n\"fixedJackpotProfile\":{\"moldIndex\":2,\"weightNumerator\":"<<fixedN<<",\"weightDenominator\":"<<fixedD<<",\"weight\":"<<double(fixedN)/fixedD;
  std::cout<<",\"minimumMixedReturnPercent\":"<<double(remainingN*low+fixedN*jackpot)/(fixedD*DRAW_SPACE)<<",\"maximumMixedReturnPercent\":"<<double(remainingN*high+fixedN*jackpot)/(fixedD*DRAW_SPACE);
  std::cout<<",\"allSettingsJackpotProbabilityNumerator\":"<<jackpotProbabilityN/probabilityGcd<<",\"allSettingsJackpotProbabilityDenominator\":"<<jackpotProbabilityD/probabilityGcd<<",\"allSettingsJackpotProbability\":"<<double(jackpotProbabilityN)/jackpotProbabilityD<<"},\n\"settings\":[";
  for(int target=50;target<=150;target++){
    Integer hn=fixedD*target*DRAW_SPACE-remainingN*low-fixedN*jackpot;
    Integer ln=remainingN*high+fixedN*jackpot-fixedD*target*DRAW_SPACE;
    assert(hn>0&&ln>0&&hn+ln+jn==weightD);
    assert(__int128(low)*ln+__int128(high)*hn+__int128(jackpot)*jn==__int128(target)*DRAW_SPACE*weightD);
    if(target>50)std::cout<<',';
    std::cout<<"{\"targetPercent\":"<<target<<",\"lowWeightNumerator\":"<<ln<<",\"highWeightNumerator\":"<<hn<<",\"jackpotWeightNumerator\":"<<jn<<",\"weightDenominator\":"<<weightD<<",\"highWeight\":"<<double(hn)/weightD<<",\"jackpotWeight\":"<<double(jn)/weightD<<",\"exactReturnPercent\":"<<target<<'}';
  }
  const Integer cutN=originalOptimal.total-50*DRAW_SPACE,cutD=originalOptimal.total,gcd=std::gcd(cutN,cutD);
  std::cout<<"],\n\"originalPaytableLayoutSearch\":{\"freeTriplets\":3276,\"triggerTripletsPerFree\":2300,\"totalProfiles\":7534800,\"method\":\"For each FREE triplet enumerate all first-five sets, evaluate each activation level, and accumulate singleton/pair/triple trigger-intersection moments. Recover all 2300 trigger triplet expectations from these moments. Minimum over all layouts bounds every draw-independent layout mixture.\",\"source\":\"scripts/dango-v262-layout-search.cpp\",\"globalMinimumOptimal\":{\"free\":";list(minOptimal.free);std::cout<<",\"trigger\":";list(minOptimal.trigger);
  std::cout<<",\"numerator\":"<<originalOptimal.total<<",\"denominator\":"<<DRAW_SPACE<<",\"returnPercent\":"<<double(originalOptimal.total)/DRAW_SPACE<<"},\"globalMinimumRandom\":{\"free\":";list(minRandom.free);std::cout<<",\"trigger\":";list(minRandom.trigger);
  std::cout<<",\"numerator\":"<<originalRandom.randomScaledTotal<<",\"denominator\":"<<DRAW_SPACE*CENTER_LCM<<",\"returnPercent\":"<<double(originalRandom.randomScaledTotal)/(DRAW_SPACE*CENTER_LCM)<<"},\"necessaryAtLeastOneTierCutFor50\":{\"numerator\":"<<cutN/gcd<<",\"denominator\":"<<cutD/gcd<<",\"percent\":"<<100.*double(cutN)/cutD<<",\"argument\":\"If every payout retains fraction r or more of its original value, every policy expectation is at least r times its original value. The optimal-layout minimum therefore remains at least r times the reported global minimum. Reaching 50% requires r <= 50/globalMinimum. This is a necessary bound, not a sufficient payout adjustment.\"}},\n";
  std::cout<<"\"crossLanguageVectors\":[";
  bool comma=false;for(std::size_t p=0;p<PROFILES.size();p++)for(int k=0;k<4;k++)for(int v=0;v<4;v++){if(comma)std::cout<<",\n";comma=true;emitVector(p,k,v,results[p].samples[k][v]);}
  std::cout<<"]\n}\n";
}

#endif // DANGO_V262_CALIBRATION_LIBRARY
