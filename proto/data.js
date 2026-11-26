window.P={
nat:{b:'N.A.T',t:'Brand Identity',y:'27SS',c:'브랜드 시스템',img:['nat/home_card.jpg','nat/bi_nat.jpg','nat/label.jpg']},
'oh-fw':{b:'ORDINARY HOLIDAY',t:'Vintage Script',y:'25FW',c:'시즌 그래픽',img:['oh/hd/fw_ohfw_lb_cross.jpg','oh/hd/fw_ohfw_lb_stairs.jpg','oh/hd/fw_ohfw_lb_brick.jpg']},
'oh-ss':{b:'ORDINARY HOLIDAY',t:'Metamorphosis',y:'25SS',c:'시즌 그래픽',img:['oh/hd/ss_lb02.jpg','oh/hd/ss_lb01.jpg','oh/hd/ss_lb03.jpg']},
'oh-vd':{b:'ORDINARY HOLIDAY × VON DUTCH',t:'Hotel Collaboration',y:'25SS',c:'협업',img:['oh/home_vd25.jpg','oh/hd/vd_008.jpg']},
'oh-vd24':{b:'ORDINARY HOLIDAY × VON DUTCH',t:'Pink Edition',y:'24FW',c:'협업',img:['oh/hd/vd24_01.jpg','oh/hd/vd24_03.jpg']},
'gola-w24':{b:'GOLA',t:'Love All Gola',y:'24FW',c:'시즌 그래픽',img:['go/home_w24_rc_k.jpg','go/hd/w24_lb2.jpg']},
'gola-ss':{b:'GOLA',t:'Heritage',y:'25SS',c:'시즌 그래픽',img:['go/hd/ss_lb01.jpg','go/hd/ss_lb02.jpg']},
'op-ss':{b:'OCEAN PACIFIC',t:'Midnight Beach',y:'24FW — 25SS',c:'시즌 그래픽',img:['097.jpg','op/w24_orca.jpg']},
cmnz:{b:'COMONINOZ',t:'Graphics, made tangible',y:'24 — 25',c:'시즌 그래픽',img:['cm/home_ss25_wl_gn.jpg','cm/hd_fw25_lb1.jpg']},
'oh-label':{b:'LABEL & TRIM',t:'브랜드별 라벨·택',y:'24 — 26',c:'라벨·부자재',img:['nat/label_point.jpg','nat/label.jpg']},
'ee-open':{b:'EE PLACE',t:'동부산점 매장 포스터',y:'2026',c:'매장',img:['ed/ee-poster-1.webp','ed/ee-poster-7.webp']},
'oh-invite':{b:'ORDINARY HOUSE',t:'팝업 초대장',y:'2024',c:'캠페인',img:['oh/invite_real.jpg']},
lilcherry:{b:'WONDERPLACE × LIL CHERRY',t:'홍대 팝업 협업',y:'2024',c:'협업',img:['ed/lil-wear.webp','ed/lil-art-0.webp']},
as:{b:'AS 과학전문학원',t:'로고에서 교재·굿즈까지',y:'2026',c:'브랜드 시스템',img:['as/home_banner2.jpg','as/lobby-sign.jpg']},
ai:{b:'AI CASTING',t:'14명의 AI 모델북',y:'2026',c:'AI 비주얼',img:['lk/tommy/02.jpg','m/juhye.jpg']},
dash26:{b:'MD DASHBOARD',t:'무신사 랭킹 트래커',y:'26FW',c:'기획·데이터',img:['db/a01.jpg']},
dashod:{b:'MD DASHBOARD',t:'스포츠·레저',y:'26FW',c:'기획·데이터',img:['db/o01.jpg']},
texworld:{b:'TEX WORLD',t:'Textile Print',y:'22 — 24',c:'텍스타일',img:['textile-a3/texworld/texworld_a3_02.jpg']},
eland:{b:'이랜드',t:'Textile Print',y:'18 — 20',c:'텍스타일',img:['textile-a3/eland/eland_a3_02.jpg']},
silknavi:{b:'SILK NAVI',t:'Textile Print Book',y:'13 — 17',c:'텍스타일',img:['textile-a3/silknavi/silknavi_a3_02.jpg']}
};
window.IMG=f=>'../img/'+f;window.LINK=id=>'../index.html#project/'+id;
document.addEventListener('DOMContentLoaded',()=>{const n=document.createElement('nav');n.className='pswitch';const here=location.pathname.split('/').pop();n.innerHTML=['a','b','c'].map(k=>`<a href="${k}.html" ${here===k+'.html'?'aria-current="page"':''}>${k.toUpperCase()}안</a>`).join('')+'<a href="../index.html">지금 사이트</a>';document.body.appendChild(n)});
