// Exact revision 285 AUTO expectation; the cyan triplet is uniform among 25 numbers.
// First-five cyan hits K have weights 1140,950,200,10 over C(25,3)=2300.
// AUTO chooses 1+K individual FREE after the first five; no future ball is consulted.
// g++ -O3 -march=native -std=c++20 scripts/dango-v287-enumerate.cpp -o /tmp/dango-v287-enumerate
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wreturn-type"
#define main dango268_legacy_main
#include "dango-v268-enumerate.cpp"
#undef main
#pragma GCC diagnostic pop
constexpr LL TRIGGER_DEN=2300;
constexpr LL TRIGGER_WAYS[4]={1140,950,200,10};
struct Profile285{LL numerator=0;array<LL,4> byBudget{};vector<Vector> vectors;};
Profile285 enumerate285(array<int,3> starts){
 U init=bit(starts[0])|bit(starts[1])|bit(starts[2]);assert(validInitial(init));
 int pool[25],n=0;for(int i=0;i<28;i++)if(!(init&bit(i)))pool[n++]=i;assert(n==25);
 Profile285 out;int index=0;
 for(int a=0;a<21;a++)for(int b=a+1;b<22;b++)for(int c=b+1;c<23;c++)
 for(int d=c+1;d<24;d++)for(int e=d+1;e<25;e++){
  U early=bit(pool[a])|bit(pool[b])|bit(pool[c])|bit(pool[d])|bit(pool[e]),manual=0;
  for(int quota=1;quota<=4;quota++){
   int chosen=-1;LL best=numeric_limits<LL>::min();
   for(int i=0;i<28;i++)if(!(early&bit(i))&&!(manual&bit(i))){
    const LL value=score(init,early,manual|bit(i));if(value>best){best=value;chosen=i;}
   }
   assert(chosen>=0);manual|=bit(chosen);out.byBudget[quota-1]+=best;
   if(index%10000==0||index==53129)out.vectors.push_back({early,manual,quota,best});
  }
  index++;
 }
 assert(index==53130);for(int q=0;q<4;q++)out.numerator+=out.byBudget[q]*TRIGGER_WAYS[q];
 return out;
}
int main(int argc,char**argv){
 bool fromStdin=false,legacyTable=false;
 for(int i=1;i<argc;i++){if(string(argv[i])=="--stdin")fromStdin=true;else if(string(argv[i])=="--legacy-table")legacyTable=true;else return 2;}
 if(!legacyTable){const int updated[6][4]={{0,0,20,220},{0,10,120,3000},{0,30,400,10000},{0,50,7500,500000},{0,120,25000,1000000},{0,60,40000,0}};
  for(int l=0;l<6;l++)for(int c=0;c<4;c++)PAY[l][c]=updated[l][c];}
 geometry();vector<array<int,3>> layouts={{{0,21,27},{1,20,22},{3,4,10}}};
 if(fromStdin){layouts.clear();int a,b,c;while(cin>>a>>b>>c)layouts.push_back({a,b,c});}
 cout<<"{\"revision\":287,\"drawDenominator\":"<<D<<",\"triggerDenominator\":"<<TRIGGER_DEN<<",\"denominator\":"<<D*TRIGGER_DEN<<",\"triggerWays\":[1140,950,200,10],\"paytableHundredths\":[";
 for(int l=0;l<6;l++){if(l)cout<<',';cout<<'[';for(int c=1;c<=3;c++){if(c>1)cout<<',';cout<<PAY[l][c];}cout<<']';}cout<<"],\"profiles\":[";
 for(size_t i=0;i<layouts.size();i++){
  auto p=enumerate285(layouts[i]);if(i)cout<<',';
  cout<<"{\"initialFreeCells\":["<<layouts[i][0]<<','<<layouts[i][1]<<','<<layouts[i][2]<<"],\"automaticNumerator\":"<<p.numerator<<",\"budgetNumerators\":[";
  for(int q=0;q<4;q++){if(q)cout<<',';cout<<p.byBudget[q];}
  cout<<"],\"vectors\":[";
  for(size_t j=0;j<p.vectors.size();j++){
   const auto&v=p.vectors[j];if(j)cout<<',';cout<<"{\"earlyCells\":[";bool comma=false;
   for(int k=0;k<28;k++)if(v.early&bit(k)){if(comma)cout<<',';comma=true;cout<<k;}
   cout<<"],\"manualCells\":[";comma=false;for(int k=0;k<28;k++)if(v.manual&bit(k)){if(comma)cout<<',';comma=true;cout<<k;}
   cout<<"],\"freeBudget\":"<<v.grade<<",\"expectedNumerator\":"<<v.numerator<<'}';
  }
  cout<<"]}";cerr<<"profile"<<i<<"="<<(double)p.numerator/(D*TRIGGER_DEN)<<"%\n";
 }
 cout<<"]}\n";
}
