// Independent v268 frequency-balanced six-row payout enumeration, no JS imports; 3 layouts x 60,568,200 outcomes.
// g++ -O3 -std=c++20 scripts/dango-v268-enumerate.cpp -o /tmp/dango-v268-enumerate
// /tmp/dango-v268-enumerate > /tmp/dango-v268-independent.json
#include <algorithm>
#include <array>
#include <cassert>
#include <cstdint>
#include <iostream>
#include <limits>
#include <vector>
using namespace std;
using U=uint32_t;using LL=int64_t;
constexpr U ALL=(U(1)<<28)-1;constexpr LL D=60568200;
int PAY[6][4]={{0,0,20,1000},{0,20,80,2000},{0,40,120,5000},
               {0,80,300,10000},{0,150,3000,50000},{0,200,5000,200000}};
U lines[6][3]{},unions[6][8]{},perimeter=0;
array<pair<int,int>,28> cells{};
constexpr LL WAYS[4]={1140,171,18,1};
int pop(U a){return __builtin_popcount(a);}
U bit(int i){return U(1)<<i;}
void geometry(){
 int cellId=0;for(int r=0;r<7;r++)for(int c=0;c<=r;c++)cells[cellId++]={r,c};
 int count[6]={};
 for(int axis=0;axis<3;axis++)for(int key=0;key<7;key++){
  U m=0;for(int i=0;i<28;i++){
   auto [r,c]=cells[i];int k=axis==0?r:axis==1?c:r-c;
   if(k==key)m|=bit(i);
  }
  int size=pop(m);if(size>=2){assert(size<=7);lines[size-2][count[size-2]++]=m;}
 }
 for(int l=0;l<6;l++){
  assert(count[l]==3);
  for(int subset=1;subset<8;subset++)for(int j=0;j<3;j++)
   if(subset&bit(j))unions[l][subset]|=lines[l][j];
 }
 perimeter=unions[5][7];assert(pop(perimeter)==18);
}
int freeQuota(U init,U early){
 U filled=init|early;
 for(int len=7;len>=2;len--)for(int j=0;j<3;j++)
  if((lines[len-2][j]&filled)==lines[len-2][j])return len;
 return 1;
}
LL score(U init,U early,U manual){
 U marked=init|early|manual;
 int odd=1+pop(init&manual),q=pop(manual&~(init|early));
 LL weighted[4]={1140LL*odd+171LL*q,171LL*odd+18LL*q,18LL*odd+q,odd},sum=0;
 for(int l=0;l<6;l++){
  LL coeff[4]={0,PAY[l][1],PAY[l][2]-2*PAY[l][1],
                 PAY[l][3]-3*PAY[l][2]+3*PAY[l][1]};
  for(int subset=1;subset<8;subset++){
   int missing=pop(unions[l][subset]&~marked);
   if(missing<=3)sum+=coeff[pop(subset)]*weighted[missing];
  }
 }
 return sum;
}
U selectFree(U init,U early,int quota){
 U manual=0;
 for(int step=0;step<quota;step++){
  int chosen=-1;LL best=numeric_limits<LL>::min();
  for(int i=0;i<28;i++)if(!(early&bit(i))&&!(manual&bit(i))){
   LL value=score(init,early,manual|bit(i));
   if(value>best){best=value;chosen=i;}
  }
  assert(chosen>=0);manual|=bit(chosen);
 }
 if(quota==7&&pop(perimeter&~(init|early))==10){
  vector<int> missing;for(int i=0;i<28;i++)
   if(perimeter&~(init|early)&bit(i))missing.push_back(i);
  assert(missing.size()==10);
  LL best=score(init,early,manual);
  for(int a=0;a<8;a++)for(int b=a+1;b<9;b++)for(int c=b+1;c<10;c++){
   U candidate=perimeter&~(init|early)&~(bit(missing[a])|bit(missing[b])|bit(missing[c]));
   LL value=score(init,early,candidate);
   if(value>best){best=value;manual=candidate;}
  }
 }
 return manual;
}
struct Vector { U early,manual; int grade; LL numerator; };
struct Result{
 LL numerator=0,grades[8]{},earlyTwo[4]{},finalCount[6][4]{},jackpot=0;
 vector<Vector> vectors;
};
bool validInitial(U init){
 for(int len=2;len<=7;len++)for(int axis=0;axis<3;axis++){
  U full=lines[len-2][axis];if((full&init)==full)return false;
  vector<int> ids;for(int cell=0;cell<28;cell++)if(full&bit(cell))ids.push_back(cell);
  for(int i=0;i+3<=len;i++)if((bit(ids[i])|bit(ids[i+1])|bit(ids[i+2]))==init)return false;
 }
 return true;
}
Result enumerate(array<int,3> starts){
 U init=bit(starts[0])|bit(starts[1])|bit(starts[2]);
 int pool[25],n=0;for(int i=0;i<28;i++)if(!(init&bit(i)))pool[n++]=i;
 assert(n==25);assert(validInitial(init));
 Result out;int firstIndex=0;
 for(int a=0;a<21;a++)for(int b=a+1;b<22;b++)
 for(int c=b+1;c<23;c++)for(int d=c+1;d<24;d++)for(int e=d+1;e<25;e++){
  U early=bit(pool[a])|bit(pool[b])|bit(pool[c])|bit(pool[d])|bit(pool[e]);
  int grade=freeQuota(init,early),two=0;
  for(int j=0;j<3;j++)if((lines[0][j]&(init|early))==lines[0][j])two++;
  out.grades[grade]++;out.earlyTwo[two]++;
  U manual=selectFree(init,early,grade);
  LL expected=score(init,early,manual);out.numerator+=expected;
  if(firstIndex%10000==0||firstIndex==53129||grade==7)out.vectors.push_back({early,manual,grade,expected});
  firstIndex++;
  U marked=init|early|manual;
  for(int l=0;l<6;l++){
   LL moments[4]={},exact[4]={};
   for(int subset=1;subset<8;subset++){
    int missing=pop(unions[l][subset]&~marked),k=pop(subset);
    moments[k]+=missing>3?0:WAYS[missing];
   }
   exact[3]=moments[3];
   exact[2]=moments[2]-3*moments[3];
   exact[1]=moments[1]-2*moments[2]+3*moments[3];
   exact[0]=1140-moments[1]+moments[2]-moments[3];
   for(int k=0;k<4;k++){assert(exact[k]>=0);out.finalCount[l][k]+=exact[k];}
  }
  if(pop(perimeter&~marked)==3)out.jackpot++;
 }
 return out;
}
int main(){
 geometry();
 array<array<int,3>,3> molds={{{0,21,27},{3,4,10},{0,2,21}}};
 cout<<"{\"revision\":268,\"denominator\":60568200,\"profiles\":[";
 for(int i=0;i<3;i++){
  Result p=enumerate(molds[i]);if(i)cout<<',';
  cout<<"{\"initialFreeCells\":["<<molds[i][0]<<","<<molds[i][1]<<","<<molds[i][2]<<"],";
  cout<<"\"optimalNumerator\":"<<p.numerator<<",\"jackpotOutcomeCount\":"<<p.jackpot<<",\"gradeCounts\":[";
  for(int j=0;j<8;j++){if(j)cout<<',';cout<<p.grades[j];}
  cout<<"],\"earlyTwoLineCounts\":[";
  for(int j=0;j<4;j++){if(j)cout<<',';cout<<p.earlyTwo[j];}
  cout<<"],\"finalLineCounts\":[";
  for(int l=0;l<6;l++){
   if(l)cout<<',';cout<<'[';
   for(int j=0;j<4;j++){if(j)cout<<',';cout<<p.finalCount[l][j];}
   cout<<']';
  }
  cout<<"],\"vectors\":[";
  for(size_t v=0;v<p.vectors.size();v++){
   const auto& x=p.vectors[v];if(v)cout<<',';
   cout<<"{\"earlyCells\":[";bool comma=false;
   for(int c=0;c<28;c++)if(x.early&bit(c)){if(comma)cout<<',';comma=true;cout<<c;}
   cout<<"],\"manualCells\":[";comma=false;
   for(int c=0;c<28;c++)if(x.manual&bit(c)){if(comma)cout<<',';comma=true;cout<<c;}
   cout<<"],\"freeBudget\":"<<x.grade<<",\"expectedNumerator\":"<<x.numerator<<'}';
  }
  cout<<"]}";
 }
 cout<<"]}\n";
}
