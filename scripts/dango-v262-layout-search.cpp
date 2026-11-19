// Exhaustive original-paytable layout feasibility proof for Dango v262.
// Build: c++ -O3 -std=c++20 scripts/dango-v262-layout-search.cpp -o /tmp/dango-v262-layout-search
// Default jackpot is 2,000x; --jackpot 20000 reproduces the earlier search.
// Optional --zero-bound also computes the optimal-play floor with jackpot zero.
// All 3,276 FREE layouts, each covering all 2,300 trigger layouts:
//   /tmp/dango-v262-layout-search --all > /tmp/dango-v262-layout-search.jsonl
// Or provide FREE triplets on stdin, one row of three integers per line. These
// independent triplets can be processed in parallel, then concatenated in the
// original lexicographic order to reproduce the same evidence hash.
//
// For one early set D, let A[k] be the mean (or optimal) conditional reward for
// expansion level k. For any trigger triplet T, k=|D intersection T|. Newton's
// finite-difference identity expresses A[k] as A[0] plus singleton, pair and
// triple intersection terms. Accumulating these coefficients across all 53,130
// early sets evaluates every T without revisiting all 53,130 sets per trigger.
// All arithmetic here is integer. Uniform-center expectations use LCM(23,5..10)
// to avoid rounding; optimal centers use exact 1,140-late-set numerators.
#define DANGO_V262_CALIBRATION_LIBRARY
#include "dango-v262-calibrate.cpp"

bool includeZeroJackpotBound=false;
Integer jackpotEvent(Mask free,Mask early,Mask footprint){
  const Mask u=GEO.lines[4][0]|GEO.lines[4][1]|GEO.lines[4][2];
  const int m=popcount(u&~(free|early|footprint));if(m>3)return 0;
  const int a=1+popcount(free&footprint),q=popcount(footprint&~(free|early));
  const std::array<Integer,4> weighted={1140*a+171*q,171*a+18*q,18*a+q,a};
  return weighted[m];
}

struct Moments {
  Integer zero=0;
  std::array<Integer,28> one{};
  std::array<Integer,28*28> two{};
  std::array<Integer,28*28*28> three{};
  void add(const std::array<int,5>&early,const std::array<Integer,4>&A){
    const Integer d1=A[1]-A[0],d2=A[2]-2*A[1]+A[0],d3=A[3]-3*A[2]+3*A[1]-A[0];
    zero+=A[0];
    for(int a=0;a<5;a++){
      const int i=early[a];one[i]+=d1;
      for(int b=a+1;b<5;b++){
        const int j=early[b];two[i*28+j]+=d2;
        for(int c=b+1;c<5;c++)three[i*28*28+j*28+early[c]]+=d3;
      }
    }
  }
  Integer evaluate(int i,int j,int k)const {
    return zero+one[i]+one[j]+one[k]+two[i*28+j]+two[i*28+k]+two[j*28+k]+three[i*28*28+j*28+k];
  }
};
struct Extremes {
  Integer minimum=std::numeric_limits<Integer>::max(),maximum=-1;
  std::vector<int> minTrigger,maxTrigger;
  void add(Integer value,int i,int j,int k){
    if(value<minimum){minimum=value;minTrigger={i,j,k};}
    if(value>maximum){maximum=value;maxTrigger={i,j,k};}
  }
};
void search(const std::vector<int>&freeIds){
  const Mask free=mask(freeIds);assert(popcount(free)==3);
  auto pool=ids(ALL&~free);assert(pool.size()==25);
  Moments optimal,random,zeroOptimal;
  for(int a=0;a<21;a++)for(int b=a+1;b<22;b++)for(int c=b+1;c<23;c++)
  for(int d=c+1;d<24;d++)for(int e=d+1;e<25;e++){
    const std::array<int,5> earlyIds={pool[a],pool[b],pool[c],pool[d],pool[e]};
    const Mask early=bit(pool[a])|bit(pool[b])|bit(pool[c])|bit(pool[d])|bit(pool[e]);
    const Integer base=score(free,early,0,REQUESTED);
    std::array<Integer,4> maximum={base,0,0,0},average={base*CENTER_LCM,0,0,0};
    std::array<Integer,4> zeroMaximum={base-jackpotHundredths*jackpotEvent(free,early,0),0,0,0};
    const Mask centers=ALL&~early;
    const int n2=popcount(centers&GEO.interior);
    assert(popcount(centers)==23&&n2>=5&&n2<=10);
    for(int center:ids(centers)){
      Integer s1=score(free,early,GEO.regions[1][center],REQUESTED);
      Integer s3=score(free,early,GEO.regions[3][center],REQUESTED);
      maximum[1]=std::max(maximum[1],s1);maximum[3]=std::max(maximum[3],s3);
      average[1]+=s1*(CENTER_LCM/23);average[3]+=s3*(CENTER_LCM/23);
      if(includeZeroJackpotBound){
        zeroMaximum[1]=std::max(zeroMaximum[1],s1-jackpotHundredths*jackpotEvent(free,early,GEO.regions[1][center]));
        zeroMaximum[3]=std::max(zeroMaximum[3],s3-jackpotHundredths*jackpotEvent(free,early,GEO.regions[3][center]));
      }
      if(GEO.interior&bit(center)){
        Integer s2=score(free,early,GEO.regions[2][center],REQUESTED);
        maximum[2]=std::max(maximum[2],s2);average[2]+=s2*(CENTER_LCM/n2);
        if(includeZeroJackpotBound)zeroMaximum[2]=std::max(zeroMaximum[2],s2-jackpotHundredths*jackpotEvent(free,early,GEO.regions[2][center]));
      }
    }
    optimal.add(earlyIds,maximum);random.add(earlyIds,average);
    if(includeZeroJackpotBound)zeroOptimal.add(earlyIds,zeroMaximum);
  }
  Extremes opt,rnd,zero;int triggerCount=0;
  for(int a=0;a<23;a++)for(int b=a+1;b<24;b++)for(int c=b+1;c<25;c++){
    int i=pool[a],j=pool[b],k=pool[c];
    opt.add(optimal.evaluate(i,j,k),i,j,k);rnd.add(random.evaluate(i,j,k),i,j,k);
    if(includeZeroJackpotBound)zero.add(zeroOptimal.evaluate(i,j,k),i,j,k);triggerCount++;
  }
  assert(triggerCount==2300);
  std::cout<<"{\"free\":";list(freeIds);
  std::cout<<",\"optimalMinimumNumerator\":"<<opt.minimum<<",\"optimalMinimumTrigger\":";list(opt.minTrigger);
  std::cout<<",\"optimalMaximumNumerator\":"<<opt.maximum<<",\"optimalMaximumTrigger\":";list(opt.maxTrigger);
  std::cout<<",\"optimalDenominator\":"<<DRAW_SPACE;
  std::cout<<",\"randomMinimumNumerator\":"<<rnd.minimum<<",\"randomMinimumTrigger\":";list(rnd.minTrigger);
  std::cout<<",\"randomMaximumNumerator\":"<<rnd.maximum<<",\"randomMaximumTrigger\":";list(rnd.maxTrigger);
  std::cout<<",\"randomDenominator\":"<<DRAW_SPACE*CENTER_LCM;
  if(includeZeroJackpotBound){
    std::cout<<",\"zeroJackpotOptimalMinimumNumerator\":"<<zero.minimum<<",\"zeroJackpotOptimalMinimumTrigger\":";list(zero.minTrigger);
    std::cout<<",\"zeroJackpotOptimalMaximumNumerator\":"<<zero.maximum<<",\"zeroJackpotOptimalMaximumTrigger\":";list(zero.maxTrigger);
  }
  std::cout<<"}\n";std::cout.flush();
}
int main(int argc,char**argv){
  configureJackpot(argc,argv);bool all=false;
  for(int i=1;i<argc;i++){if(std::string(argv[i])=="--all")all=true;if(std::string(argv[i])=="--zero-bound")includeZeroJackpotBound=true;}
  if(all){
    for(int a=0;a<26;a++)for(int b=a+1;b<27;b++)for(int c=b+1;c<28;c++)search({a,b,c});
    return 0;
  }
  int a,b,c;while(std::cin>>a>>b>>c){assert(0<=a&&a<b&&b<c&&c<28);search({a,b,c});}
}
