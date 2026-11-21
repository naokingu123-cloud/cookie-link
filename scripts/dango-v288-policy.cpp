// Exact Dango v288 payout expectation, independent of the JavaScript runtime.
// 53,130 first-five sets x four FREE quotas x 1,140 future-three combinations
// integrated in integer arithmetic; cyan quota weights 1140:950:200:10.
// Compile: g++ -O3 -std=c++20 scripts/dango-v288-policy.cpp -o /tmp/dango-v288-policy
#define main dango268_legacy_main
#include "dango-v268-enumerate.cpp"
#undef main
constexpr LL CYAN_DEN=2300;
constexpr LL CYAN_WAYS[4]={1140,950,200,10};
struct PolicyProfile {LL totals[2][4]{};LL numerator[2]{};};
PolicyProfile profile288(array<int,3> starts){
 U initial=bit(starts[0])|bit(starts[1])|bit(starts[2]);
 assert(validInitial(initial));
 int pool[25],size=0;
 for(int i=0;i<28;i++)if(!(initial&bit(i)))pool[size++]=i;
 assert(size==25);
 PolicyProfile result;int earlySets=0;
 for(int a=0;a<21;a++)for(int b=a+1;b<22;b++)for(int c=b+1;c<23;c++)
 for(int d=c+1;d<24;d++)for(int e=d+1;e<25;e++){
  const U early=bit(pool[a])|bit(pool[b])|bit(pool[c])|bit(pool[d])|bit(pool[e]);
  U manual[2]={0,0};earlySets++;
  for(int step=0;step<4;step++)for(int policy=0;policy<2;policy++){
   int chosen=-1;
   if(policy==0){
    LL highest=numeric_limits<LL>::min();
    for(int i=0;i<28;i++)if(!(early&bit(i))&&!(manual[policy]&bit(i))){
     LL value=score(initial,early,manual[policy]|bit(i));
     if(value>highest){highest=value;chosen=i;}
    }
   }else{
    const U salt=(initial*2654435761u)^(early*2246822519u)^(U(step)*3266489917u);
    int options=0;
    for(int i=0;i<28;i++)if(!(early&bit(i))&&!(manual[policy]&bit(i)))options++;
    int index=(int)(salt%U(options));
    for(int i=0;i<28;i++)if(!(early&bit(i))&&!(manual[policy]&bit(i))){
     if(index--==0){chosen=i;break;}
    }
   }
   assert(chosen>=0);manual[policy]|=bit(chosen);
   result.totals[policy][step]+=score(initial,early,manual[policy]);
  }
 }
 assert(earlySets==53130);
 for(int policy=0;policy<2;policy++)for(int q=0;q<4;q++)
  result.numerator[policy]+=result.totals[policy][q]*CYAN_WAYS[q];
 return result;
}
int main(){
 geometry();
 const int table[6][4]={
  {0,0,20,2000},{0,20,100,3000},{0,50,400,10000},
  {0,100,5000,100000},{0,300,20000,200000},{0,500,50000,0}
 };
 for(int i=0;i<6;i++)for(int j=0;j<4;j++)PAY[i][j]=table[i][j];
 const array<array<int,3>,3> starts={{{0,21,27},{1,20,22},{3,4,10}}};
 cout<<"{\"revision\":288,\"denominator\":"<<D*CYAN_DEN<<",\"cyanWays\":[1140,950,200,10],\"profiles\":[";
 for(int k=0;k<3;k++){
  const auto p=profile288(starts[k]);if(k)cout<<",";
  cout<<"{\"initialFreeCells\":["<<starts[k][0]<<","<<starts[k][1]<<","<<starts[k][2]<<"],";
  cout<<"\"maxNumerator\":"<<p.numerator[0]<<",\"uniformNumerator\":"<<p.numerator[1]<<",\"byQuotaMax\":[";
  for(int i=0;i<4;i++){if(i)cout<<",";cout<<p.totals[0][i];}
  cout<<"],\"byQuotaUniform\":[";
  for(int i=0;i<4;i++){if(i)cout<<",";cout<<p.totals[1][i];}
  cout<<"]}";
 }
 cout<<"]}\n";
}
