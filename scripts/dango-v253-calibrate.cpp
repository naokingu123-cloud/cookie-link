// ダンゴデビンゴ v253: exact optimal-manual payout calibration (initial FREE required).
// Usage: binary LABEL OUTPUT_JSON [full|symmetry] INITIAL_FREE_MASK
// Build: g++ -O3 -std=c++20 scripts/dango-v253-calibrate.cpp -o dango-v253-calibrate
// Payout tenths: 3=[1,5,50,1000], 4=[4,30,500,5000], 5=[30,1000,20000], 7=250, 9=1000.
// Also evaluates the production simple auto policy independently; no future input.
// Non-symmetric molds use full first-five enumeration; mirrored molds are equivalent.
// Cells are row-major zero-based; one example: initial cells6,7,8 (one-based) =>0xe0.
// Each first5 set is evaluated against every legal player FREE placement and
// all1,140 remaining triples. The maximum is selected BEFORE any future triple.
// Initial FREE grants one player FREE only when hit within first5; it never adds odds.
// Line completion grants no FREE. Only player FREE hits in final3 add odds.
// Payouts above a listed top tier keep that top tier (3:4+,4:4+,5:3+).
#include <algorithm>
#include <array>
#include <bit>
#include <chrono>
#include <cstdint>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <map>
#include <string>
#include <tuple>
#include <vector>
using namespace std;using U=uint32_t;using LL=uint64_t;constexpr U ALL=(1u<<25)-1;
struct Cell{int r,x;};struct Line{int length;U mask;};
int main(int argc,char**argv){
 string mode=argc>1?argv[1]:"plain",output=argc>2?argv[2]:"dango-calibration.json";
 bool full=argc>3&&string(argv[3])=="full";U initial=argc>4?stoul(argv[4],nullptr,0):0;string variant="v253";
 if((initial&~ALL)||popcount(initial)<1||popcount(initial)>3){cerr<<"Initial FREE must be1..3 cells within25.\n";return 2;}
 vector<Cell> cells;for(int r=0;r<5;r++)for(int x=-r;x<=r;x++)cells.push_back({r,x});vector<Line>lines;
 for(int a=0;a<4;a++){map<int,U> groups;for(int i=0;i<25;i++){auto c=cells[i];int k=a==0?c.r:a==1?c.x:a==2?c.x-c.r:c.x+c.r;groups[k]|=1u<<i;}for(auto[k,m]:groups)if(popcount(m)>=3)lines.push_back({popcount(m),m});}
 array<int,5>lens={3,4,5,7,9},shift={0,3,6,9,10};vector<uint16_t> counts(1u<<25,0),base(1u<<25,0);
 for(auto l:lines){int g=find(lens.begin(),lens.end(),l.length)-lens.begin();uint16_t add=1u<<shift[g];U rest=ALL^l.mask,s=rest;do{counts[s|l.mask]+=add;if(!s)break;s=(s-1)&rest;}while(true);}
 array<int,8>p3={0,1,5,50,1000,1000,1000,1000},p4={0,4,30,500,5000,5000,5000,5000},p5={0,30,1000,20000,20000,20000,20000,20000};int p7=250,p9=1000;
 for(U m=0;m<=ALL;m++){auto c=counts[m];base[m]=p3[c&7]+p4[(c>>3)&7]+p5[(c>>6)&7]+p7*((c>>9)&1)+p9*((c>>10)&1);}
 array<int,25>mirror;for(int i=0;i<25;i++)for(int j=0;j<25;j++)if(cells[j].r==cells[i].r&&cells[j].x==-cells[i].x)mirror[i]=j;
 auto reflect=[&](U h){U m=0;while(h){int i=countr_zero(h);h&=h-1;m|=1u<<mirror[i];}return m;};
 if(reflect(initial)!=initial)full=true;
 auto hash32=[](U x){x^=x>>16;x*=0x7feb352dU;x^=x>>15;x*=0x846ca68bU;x^=x>>16;return x;};
 auto greedy=[&](U rawH,int F){
  U ri=reflect(initial),rh=reflect(rawH);bool mirrored=ri<initial||(ri==initial&&rh<rawH);
  U ih=mirrored?ri:initial,hh=mirrored?rh:rawH,selected=0;
  for(int step=0;step<F;step++){
   U marked=ih|hh|selected,bestBit=0;tuple<int,int,int,int,int,int,U> best{-1,-1,-1,-1,-100,-1,0};
   for(int id=0;id<25;id++)if(!(marked&(1u<<id))){
    int complete=0,longComplete=0,longReach=0,reachCount=0,closest=100,longClosest=0;
    for(auto line:lines)if(line.mask&(1u<<id)){
     int missing=popcount(line.mask&~marked);
     if(missing==1){complete++;longComplete=max(longComplete,line.length);}
     if(missing==2){longReach=max(longReach,line.length);reachCount++;}
     if(missing>2){if(missing<closest){closest=missing;longClosest=line.length;}else if(missing==closest)longClosest=max(longClosest,line.length);}
    }
    auto score=make_tuple(complete,longComplete,longReach,reachCount,-closest,longClosest,
     hash32(hh^(ih*0xc2b2ae35U)^((id+1)*0x9e3779b9U)^((step+1)*0x85ebca6bU)));
    if(score>best){best=score;bestBit=1u<<id;}
   }
   selected|=bestBit;
  }
  return mirrored?reflect(selected):selected;
 };
 LL automaticSum=0,automaticAwards=0;array<int,5> vectorCount{};
 vector<tuple<U,U,U,int,int,int>> vectors;
 auto start=chrono::steady_clock::now();LL ht=0,reps=0,candidates=0,sum=0,awards=0,baseSum=0;array<LL,11>freeDist{},byOldF{},byAwardF{};array<LL,4>overlaps{};array<int,5>maxCounts{};
 ofstream policies(output+".policies.csv");policies<<"H,weight,originalF,F,optimalFree,expectedTenths,awardTriples\n";
 U h=31;while(h<(1u<<25)){U mh=reflect(h);if(full||h<=mh){int weight=full||h==mh?1:2;ht+=weight;reps++;U ih=h|initial;int old=1;int F=min(4,1+popcount(initial&h));
 freeDist[F]+=weight;
 array<U,20>remain,available;int rn=0,an=0;for(int i=0;i<25;i++){U b=1u<<i;if(!(h&b))remain[rn++]=b;if(!(ih&b))available[an++]=b;}array<U,1140>triples;int dn=0;for(int a=0;a<18;a++)for(int b=a+1;b<19;b++)for(int c=b+1;c<20;c++){U d=remain[a]|remain[b]|remain[c];triples[dn++]=d;}
 U bestF=0;uint32_t best=0;int bestAward=-1;
 auto evaluate=[&](U f){candidates++;U hf=ih|f;uint32_t ev=0;int aw=0;
 for(int i=0;i<1140;i++){U d=triples[i];int b=base[hf|d];ev+=b*(1+popcount(f&d));aw+=b>0;}
 if(ev>best||(ev==best&&(aw>bestAward||(aw==bestAward&&f<bestF)))){best=ev;bestAward=aw;bestF=f;}};
 if(F==0)evaluate(0);else if(F==1){for(int a=0;a<an;a++)evaluate(available[a]);}
 else if(F==2){for(int a=0;a<an-1;a++)for(int b=a+1;b<an;b++)evaluate(available[a]|available[b]);}
 else if(F==3){for(int a=0;a<an-2;a++)for(int b=a+1;b<an-1;b++)for(int c=b+1;c<an;c++)evaluate(available[a]|available[b]|available[c]);}
 else {U comb=(1u<<F)-1;while(comb<(1u<<an)){U f=0,t=comb;while(t){int ix=countr_zero(t);t&=t-1;f|=available[ix];}evaluate(f);U a=comb&-comb,b=comb+a;if(b>=(1u<<an))break;comb=(((b^comb)>>2)/a)|b;}}
 U autoF=greedy(h,F);uint32_t autoEV=0;int autoAward=0;
 for(U d:triples){int bp=base[ih|autoF|d];autoEV+=bp*(1+popcount(autoF&d));autoAward+=bp>0;}
 automaticSum+=weight*LL(autoEV);automaticAwards+=weight*autoAward;
 if(vectorCount[F]<3){
  U d=triples[(hash32(h)^autoF)%1140];int mult=1+popcount(autoF&d);
  vectors.emplace_back(h,autoF,d,F,mult,10*base[ih|autoF|d]*mult);vectorCount[F]++;
 }
 sum+=weight*LL(best);awards+=weight*bestAward;byOldF[old]+=weight*LL(best);byAwardF[F]+=weight*LL(best);
 for(U d:triples){U m=ih|bestF|d;int b=base[m];baseSum+=weight*b;overlaps[popcount(bestF&d)]+=weight;auto c=counts[m];for(int g=0;g<5;g++)maxCounts[g]=max(maxCounts[g],int((c>>shift[g])&(g<3?7:1)));}
 policies<<h<<","<<weight<<","<<old<<","<<F<<","<<bestF<<","<<best<<","<<bestAward<<"\n";
 if(reps%5000==0)cerr<<mode<<" processed "<<ht<<" /53130, candidates "<<candidates<<", elapsed "<<chrono::duration<double>(chrono::steady_clock::now()-start).count()<<" s\n";
 }
 U c=h&-h,r=h+c;if(r>=(1u<<25))break;h=(((r^h)>>2)/c)|r;}
 double elapsed=chrono::duration<double>(chrono::steady_clock::now()-start).count();ofstream out(output);out<<setprecision(14);
 out<<"{\"mode\":\""<<mode<<"\",\"initialFreeMask\":"<<initial<<",\"oddsRule\":\"1 + raw hits on player FREE in last three only; initial FREE hits grant extra player FREE during first five only; no line awards\",\"payoutVariant\":\""<<variant<<"\",\"payoutTiers\":\"counts above last defined tier receive that last tier, not a new payout\",\"symmetryReduced\":"<<(full?"false":"true")<<",\"firstFiveSets\":"<<ht<<",\"representatives\":"<<reps<<",\"freeCandidates\":"<<candidates<<",\"outcomeDenominator\":"<<ht*1140<<",\"payoutTenthsDenominator\":"<<ht*11400<<",\"expectedPayoutTenthsNumerator\":"<<sum<<",\"rtpPercent\":"<<100.0*sum/(ht*11400)<<",\"basePayoutTenthsNumerator\":"<<baseSum<<",\"awardNumerator\":"<<awards<<",\"awardPercent\":"<<100.0*awards/(ht*1140)<<",\"elapsedSeconds\":"<<elapsed<<",\"freeDistribution\":[";
 for(int i=0;i<11;i++){if(i)out<<",";out<<freeDist[i];}out<<"],\"expectedPayoutByOriginalF\":[";for(int i=0;i<11;i++){if(i)out<<",";out<<byOldF[i];}out<<"],\"expectedPayoutByAwardedF\":[";for(int i=0;i<11;i++){if(i)out<<",";out<<byAwardF[i];}out<<"],\"overlapDistribution\":[";for(int i=0;i<4;i++){if(i)out<<",";out<<overlaps[i];}out<<"],\"maxCountsInOptimalOutcomes\":[";for(int i=0;i<5;i++){if(i)out<<",";out<<maxCounts[i];}out<<"],\"automaticPayoutTenthsNumerator\":"<<automaticSum<<",\"automaticRtpPercent\":"<<10.0*automaticSum/(ht*1140)<<",\"automaticAwardNumerator\":"<<automaticAwards<<",\"automaticAwardPercent\":"<<100.0*automaticAwards/(ht*1140)<<",\"crossLanguageVectors\":[";
 for(size_t i=0;i<vectors.size();i++){if(i)out<<",";auto [h,f,d,F,mult,pay]=vectors[i];out<<"{\"firstFiveMask\":"<<h<<",\"manualMask\":"<<f<<",\"lastThreeMask\":"<<d<<",\"budget\":"<<F<<",\"multiplier\":"<<mult<<",\"hundredths\":"<<pay<<"}";}
 out<<"]}\n";
 cerr<<"DONE "<<mode<<" RTP="<<100.0*sum/(ht*11400)<<" auto="<<10.0*automaticSum/(ht*1140)<<" award="<<100.0*awards/(ht*1140)<<" elapsed="<<elapsed<<" s\n";
}
