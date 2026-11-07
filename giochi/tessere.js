// Facce tradizionali del mahjong disegnate in SVG: bambù (b1-b9), cerchi (d1-d9), caratteri (c1-c9),
// venti (wE wS wW wN), draghi (drR drG drW), fiori (fl1-fl4) e stagioni (se1-se4).
window.Tessere=(function(){
'use strict';
const R='#c0392b',Gc='#1e8449',B='#1f4e9e',K='#1a1a1a';
const NUM=['一','二','三','四','五','六','七','八','九'];
const sv=(inner)=>`<svg viewBox="0 0 44 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
const txt=(t,x,y,size,fill,extra)=>`<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${fill}" text-anchor="middle" font-family="'Noto Sans CJK SC','Noto Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei','WenQuanYi Zen Hei',serif" ${extra||''}>${t}</text>`;
// cerchi
function dot(x,y,r,c){return`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${r*0.55}" fill="#fff" opacity=".9"/><circle cx="${x}" cy="${y}" r="${r*0.25}" fill="${c}"/>`}
const DOTS={1:[[22,30,12]],2:[[22,16,8],[22,44,8]],3:[[11,13,6],[22,30,6],[33,47,6]],4:[[13,16,6],[31,16,6],[13,44,6],[31,44,6]],5:[[12,14,5.5],[32,14,5.5],[22,30,5.5],[12,46,5.5],[32,46,5.5]],6:[[14,12,5.5],[30,12,5.5],[14,30,5.5],[30,30,5.5],[14,48,5.5],[30,48,5.5]],7:[[10,10,4.8],[22,15,4.8],[34,20,4.8],[13,37,4.8],[31,37,4.8],[13,51,4.8],[31,51,4.8]],8:[[14,9,4.8],[30,9,4.8],[14,23,4.8],[30,23,4.8],[14,37,4.8],[30,37,4.8],[14,51,4.8],[30,51,4.8]],9:[[11,12,4.8],[22,12,4.8],[33,12,4.8],[11,30,4.8],[22,30,4.8],[33,30,4.8],[11,48,4.8],[22,48,4.8],[33,48,4.8]]};
const DOTC={1:[Gc],2:[Gc,B],3:[B,R,Gc],4:[B,Gc,Gc,B],5:[B,Gc,R,Gc,B],6:[Gc,Gc,R,R,R,R],7:[Gc,Gc,Gc,R,R,R,R],8:[B,B,B,B,B,B,B,B],9:[B,B,B,R,R,R,Gc,Gc,Gc]};
// bambù
function stick(x,y,h,c){return`<rect x="${x-3}" y="${y-h/2}" width="6" height="${h}" rx="2.6" fill="${c}"/><rect x="${x-3.6}" y="${y-1.3}" width="7.2" height="2.6" rx="1" fill="#fff" opacity=".85"/><rect x="${x-3.6}" y="${y-h/2+3}" width="7.2" height="1.6" rx=".8" fill="#fff" opacity=".5"/><rect x="${x-3.6}" y="${y+h/2-4.6}" width="7.2" height="1.6" rx=".8" fill="#fff" opacity=".5"/>`}
const BAM={2:[[22,18,Gc],[22,42,B]],3:[[22,15,B],[13,43,Gc],[31,43,Gc]],4:[[13,18,Gc],[31,18,B],[13,42,B],[31,42,Gc]],5:[[12,15,Gc],[32,15,B],[22,30,R],[12,45,B],[32,45,Gc]],6:[[11,18,Gc],[22,18,Gc],[33,18,Gc],[11,42,B],[22,42,B],[33,42,B]],7:[[22,11,R],[11,30,Gc],[22,30,Gc],[33,30,Gc],[11,49,B],[22,49,B],[33,49,B]],8:[[11,13,Gc],[22,13,Gc],[33,13,Gc],[15,30,R],[29,30,R],[11,47,B],[22,47,B],[33,47,B]],9:[[11,13,Gc],[22,13,Gc],[33,13,Gc],[11,30,R],[22,30,R],[33,30,R],[11,47,B],[22,47,B],[33,47,B]]};
const BIRD=`<path d="M12 40c0-9 7-14 14-13 5 1 9 6 8 12-1 5-5 8-11 8-7 0-11-3-11-7z" fill="${Gc}"/><circle cx="29" cy="24" r="6" fill="${Gc}"/><circle cx="31" cy="23" r="1.6" fill="#fff"/><circle cx="31.5" cy="23" r=".8" fill="${K}"/><path d="M34 25l7 2-7 2z" fill="${R}"/><path d="M12 38l-8-6 2 9 6 1z" fill="${R}"/><path d="M20 47l-3 6M26 47l1 6" stroke="${R}" stroke-width="2" stroke-linecap="round"/><path d="M14 36c4-3 8-3 12 0" stroke="#fff" stroke-width="1.5" fill="none" opacity=".7"/>`;
function svg(code){
  if(code==='wE')return sv(txt('東',22,42,30,B)+txt('E',6,10,8,K));
  if(code==='wS')return sv(txt('南',22,42,30,B)+txt('S',6,10,8,K));
  if(code==='wW')return sv(txt('西',22,42,30,B)+txt('W',6,10,8,K));
  if(code==='wN')return sv(txt('北',22,42,30,B)+txt('N',6,10,8,K));
  if(code==='drR')return sv(txt('中',22,42,32,R));
  if(code==='drG')return sv(txt('發',22,42,32,Gc));
  if(code==='drW')return sv(`<rect x="8" y="9" width="28" height="42" rx="3" fill="none" stroke="${B}" stroke-width="3.5"/><rect x="14" y="16" width="16" height="28" rx="2" fill="none" stroke="${B}" stroke-width="2" stroke-dasharray="4 3"/>`);
  if(code.startsWith('fl')){const n=+code[2];const F=['梅','蘭','菊','竹'];return sv(txt(F[n-1],22,44,26,B)+txt(String(n),7,11,9,R)+`<circle cx="36" cy="9" r="4" fill="${R}" opacity=".85"/><circle cx="36" cy="9" r="1.6" fill="#fff"/>`)}
  if(code.startsWith('se')){const n=+code[2];const F=['春','夏','秋','冬'];return sv(txt(F[n-1],22,44,26,R)+txt(String(n),7,11,9,B)+`<path d="M31 6l4 3-4 3 1-3z" fill="${Gc}"/>`)}
  const s=code[0],n=+code.slice(1);
  if(s==='d'&&DOTS[n])return sv(DOTS[n].map(([x,y,r],i)=>dot(x,y,r,DOTC[n][i])).join(''));
  if(s==='b'&&(n===1||BAM[n]))return sv(n===1?BIRD:BAM[n].map(([x,y,c])=>stick(x,y,n>=8?13:15,c)).join(''));
  if(s==='c'&&NUM[n-1])return sv(txt(NUM[n-1],22,24,19,B)+txt('萬',22,53,21,R));
  return sv(txt('?',22,40,28,K));
}
const FACCE=[];for(let i=1;i<=9;i++){FACCE.push('d'+i,'b'+i,'c'+i)}FACCE.push('wE','wS','wW','wN','drR','drG','drW','fl1','fl2','fl3','fl4','se1','se2','se3','se4');
const NOMI={d:'cerchi',b:'bambù',c:'caratteri',w:'vento',dr:'drago',fl:'fiore',se:'stagione'};
function nome(code){if(code.startsWith('dr'))return'drago';if(code.startsWith('fl'))return'fiore '+code[2];if(code.startsWith('se'))return'stagione '+code[2];return(NOMI[code[0]]||'')+' '+code.slice(1)}
return{FACCE,svg,nome};
})();
