// Count events (including repeat sweeps) and games (at least one sweep) per 25P8.
// Run from the repository root.
// c++ -O3 -std=c++17 .github/tests/waffle-reversal-exact.cpp -o /tmp/waffle-exact
// sed -n "s/.*quarter:'\([.BW]*\)'.*/\1/p" assets/bingo-stick-rules.js | /tmp/waffle-exact
#include <algorithm>
#include <array>
#include <cstdint>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

using Bits = std::uint64_t;
constexpr int special = 20, balls = 8;
constexpr Bits deals = 43609104000ULL;

struct Mold {
    std::array<Bits, 2> opening{};
    std::array<Bits, 21> origin{}, reachable{};
    std::array<std::vector<std::vector<Bits>>, 21> rays;

    explicit Mold(const std::string& quarter) {
        if (quarter.size() != 16 || std::count(quarter.begin(),quarter.end(),'.') != 5 ||
            quarter.find_first_not_of(".BW") != std::string::npos)
            throw std::invalid_argument("Expected 4x4 quarter with five numbered positions");
        int slot = 0;
        for (int y=0; y<8; ++y) for (int x=0; x<8; ++x) {
            const char cell = quarter[4*std::min(y,7-y) + std::min(x,7-x)];
            const Bits bit = Bits{1} << (8*y+x);
            if (cell != '.') { opening[cell=='W'] |= bit; continue; }
            origin[slot] = bit;
            for (int dy=-1; dy<=1; ++dy) for (int dx=-1; dx<=1; ++dx) {
                if (!dx && !dy) continue;
                std::vector<Bits> ray;
                for (int cx=x+dx, cy=y+dy; cx>=0 && cx<8 && cy>=0 && cy<8; cx+=dx,cy+=dy)
                    ray.push_back(Bits{1} << (8*cy+cx));
                if (ray.size()<2) continue;
                // A stone at the far board edge cannot be bracketed from this origin.
                for (size_t i=0; i+1<ray.size(); ++i) reachable[slot] |= ray[i];
                rays[slot].push_back(ray);
            }
            ++slot;
        }
    }
    Bits flips(int slot, Bits mine, Bits enemy) const {
        Bits all=0;
        for (const auto& ray:rays[slot]) {
            Bits run=0;
            for (Bits bit:ray) {
                if (bit&enemy) { run|=bit; continue; }
                if (bit&mine) all|=run;
                break;
            }
        }
        return all;
    }
};

// To eliminate a color on a given ball, every remaining opposing stone must
// lie on at least one geometric ray of a future winning-color shot. This is a
// necessary condition only. Every surviving sequence plays the actual rule.
struct Count {
    const Mold& m;
    const int length, winner;
    std::array<int,balls> shots{};
    std::array<Bits,balls+1> future{};
    Bits events=0, firsts=0;

    Count(const Mold& mold,int n):m(mold),length(n),winner((n-1)%2) {}
    void play(int turn, Bits mine, Bits enemy, unsigned reserved, int specials, Bits ways, bool prior) {
        if (enemy & ~future[turn]) return;
        if (turn%2==winner) {
            const int pos=shots[turn];
            if (pos==special && !specials) return;
            const Bits flip=m.flips(pos,mine,enemy);
            const bool swept=enemy && enemy==flip;
            if (turn+1==length) {
                if (swept) { events+=ways; if (!prior) firsts+=ways; }
                return;
            }
            const bool pass=pos==special;
            play(turn+1,mine|m.origin[pos]|flip,enemy^flip,reserved,specials-pass,
                 ways*(pass?specials:1),prior||swept);
        } else {
            if (specials) play(turn+1,mine,enemy,reserved,specials-1,ways*specials,prior);
            for (int pos=0;pos<special;++pos) {
                const unsigned bit=1u<<pos;
                if (reserved&bit) continue;
                const Bits flip=m.flips(pos,enemy,mine);
                play(turn+1,mine^flip,enemy|m.origin[pos]|flip,reserved|bit,specials,ways,
                     prior||(mine && mine==flip));
            }
        }
    }
    void chooseShots(int turn, Bits cover, unsigned reserved) {
        if (turn>=length) {
            if (m.opening[1-winner] & ~cover) return;
            for (int i=length-1;i>=0;--i)
                future[i]=future[i+1]|(i%2==winner?m.reachable[shots[i]]:0);
            play(0,m.opening[winner],m.opening[1-winner],reserved,5,1,false);
            return;
        }
        for (int pos=0;pos<=special;++pos) {
            const unsigned bit=pos==special?0:1u<<pos;
            // An off-board ball makes no placement and cannot cause the sweep.
            if ((reserved&bit) || (turn+1==length && pos==special)) continue;
            shots[turn]=pos;
            chooseShots(turn+2,cover|m.reachable[pos],reserved|bit);
        }
    }
};

int main() {
    std::string quarter;
    while (std::cin >> quarter) {
        Mold mold(quarter);
        Bits events=0, games=0, prefixes=1;
        for (int n=1;n<=balls;++n) {
            Count c(mold,n);
            c.chooseShots(c.winner,0,0);
            prefixes*=26-n;
            // Every qualifying prefix has the same number of eight-ball continuations.
            events+=c.events*(deals/prefixes);
            games+=c.firsts*(deals/prefixes);
        }
        std::cout<<quarter<<" events="<<events<<" games="<<games<<" draws="<<deals<<'\n';
    }
}
