(() => {
  'use strict';
  const data = window.PORTFOLIO_DATA;
  if (!data) return;
  const { projects, sprites, models, modelCounts, imageSizes = {} } = data;
  projects.sort((a,b)=>Number(a.workRow.no)-Number(b.workRow.no));
  const $ = (id) => document.getElementById(id);
  const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const projectDialog = $('project-dialog');
  const lightbox = $('lightbox');
  const categoryNames = {brand:'브랜드 그래픽 시스템',graphic:'상품 그래픽',textile:'텍스타일',data:'기획·데이터',touchpoint:'브랜드 제작물'};
  let filter = 'all', view = 'list', indexLimit = Infinity, search = '';
  let gallery = [], galleryIndex = 0, savedY = 0, homeHash = '#work', opener = null;
  let activeRoute = '', closing = false;
  const observedImages = new WeakSet();
  let assetId = 0;

  function normalizeRef(ref) { if(typeof ref==='string' && ref.startsWith('{')) {try{return JSON.parse(ref);}catch{}} return typeof ref === 'string' && /^\d+$/.test(ref) ? +ref : ref; }
  function imageInfo(ref) {
    ref = normalizeRef(ref);
    if (typeof ref === 'object') {
      if(ref.file && ref.crop){const [w,h]=imageSizes[ref.file];const [x,y,cw,ch]=ref.crop;return {file:ref.file,fullW:w,fullH:h,x,y,w:cw,h:ch};}
      if (ref.model) {
        const one = `lk/${ref.model.toLowerCase()}/${String(ref.look).padStart(2,'0')}.jpg`;
        if (imageSizes[one]) return {file:one, w:imageSizes[one][0], h:imageSizes[one][1], simple:true};
        const file = `lk/${ref.model.toLowerCase()}.jpg`, count = modelCounts[ref.model];
        const [w,h] = imageSizes[file] || [count * 900,1200];
        return {file, fullW:w, fullH:h, x:(w/count)*ref.look, y:0, w:w/count, h};
      }
      if (ref.tile) {
        const [w,h] = imageSizes[ref.tile] || [3000,2124];
        return {file:ref.tile, fullW:w,fullH:h,x:(ref.index%ref.cols)*w/ref.cols,y:Math.floor(ref.index/ref.cols)*h/ref.rows,w:w/ref.cols,h:h/ref.rows};
      }
    }
    const name = typeof ref === 'number' ? String(ref).padStart(3,'0') + '.jpg' : ref;
    const region = data.assetRegions?.[name];
    if(region)return imageInfo(region);
    const standalone = data.assetFiles?.[name];
    if(standalone){const size=imageSizes[standalone];return {file:standalone,w:size[0],h:size[1],simple:true,original:name};}
    if (sprites[name]) {
      const [file,y,h,H] = sprites[name];
      return {file,fullW:1000,fullH:H,x:0,y,w:1000,h};
    }
    const size = imageSizes[name] || [1000,750];
    return {file:name,w:size[0],h:size[1],simple:true};
  }
  function asset(ref, alt = '', eager = false, fit = 'meet') {
    const a = imageInfo(ref), src = `img/${a.file}${data.assetVersions?.[a.file]?`?v=${data.assetVersions[a.file]}`:""}`;
    if (a.simple) return `<span class="asset" style="aspect-ratio:${a.w}/${a.h}"><img class="asset-img" src="${esc(src)}" ${a.original?`data-original-src="img/${esc(a.original)}"`:""} alt="${esc(alt)}" loading="${eager?'eager':'lazy'}" decoding="async" width="${a.w}" height="${a.h}"></span>`;
    const cropId = `asset-crop-${++assetId}`;
    return `<span class="asset" style="aspect-ratio:${a.w}/${a.h}"><svg class="asset-sprite" viewBox="${a.x} ${a.y} ${a.w} ${a.h}" preserveAspectRatio="xMidYMid ${fit}" role="img" aria-label="${esc(alt)}" style="display:block;width:100%;height:100%;overflow:hidden"><defs><clipPath id="${cropId}"><rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}"/></clipPath></defs><image ${eager?'href':'data-image-src'}="${esc(src)}" width="${a.fullW}" height="${a.fullH}" x="0" y="0" clip-path="url(#${cropId})"/></svg></span>`;
  }
  document.addEventListener('error',event=>{const img=event.target;if(img instanceof HTMLImageElement && img.dataset.originalSrc){const source=img.dataset.originalSrc;delete img.dataset.originalSrc;img.src=source;}},true);
  const imageObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const image = entry.target;
        image.setAttribute('href', image.dataset.imageSrc);
        image.removeAttribute('data-image-src');
        imageObserver.unobserve(image);
      }
    });
  }, {rootMargin:'700px 0px'});
  function hydrateImages(root = document) {
    root.querySelectorAll('[data-image]').forEach(el => {
      el.innerHTML = asset(normalizeRef(el.dataset.image), el.dataset.alt || '', el.closest('.hero') !== null, el.closest('.hero-fashion,.work-visual,.opening-photo') ? 'slice' : 'meet');
      delete el.dataset.image;
    });
    root.querySelectorAll('[data-model]').forEach(el => {
      el.innerHTML = asset({model:el.dataset.model,look:+el.dataset.look || 0}, `${el.dataset.model} AI 비주얼`, el.closest('.hero') !== null, el.dataset.fit || 'slice');
      delete el.dataset.model;
    });
    root.querySelectorAll('[data-image-src]').forEach(el => {
      if (!observedImages.has(el)) { imageObserver.observe(el); observedImages.add(el); }
    });
  }

  function renderIndex() {
    const compact=str=>String(str).toLowerCase().replace(/[\s·×.—-]/g,'');
    const terms=search.trim().split(/\s+/).filter(Boolean).map(compact);
    const selected=projects.filter(p=>(filter==='all'||(filter==='design'?['brand','graphic'].includes(p.category):filter==='touchpoint'?p.customerTouchpoint:p.category===filter))&&terms.every(term=>compact([p.brand,p.title,p.season,p.tech,...Object.values(p.workRow)].join(' ')).includes(term)));
    $('index-title').textContent='Work';$('index-total').textContent=projects.length;
    $('project-index').className='work-table-scroll';
    $('project-index').innerHTML=`<table class="work-table"><caption class="sr-only">프로젝트 목록 — 이름, 브랜드, 분야와 연도</caption><thead><tr><th scope="col">No.</th><th scope="col">Name</th><th scope="col">Brand</th><th scope="col">Category</th><th scope="col">Year</th></tr></thead><tbody>${selected.map(p=>{const r=p.workRow;return `<tr><td>${esc(r.no)}</td><td><a class="work-row-link" href="#project/${p.id}" aria-label="${esc(r.brand+' / '+r.name+' 상세 보기')}">${esc(r.name)}</a></td><td>${esc(r.brand)}</td><td>${esc(r.category)}</td><td>${esc(r.year)}</td></tr>`;}).join('')}</tbody></table>`;
    $('filter-result').textContent=`${selected.length}개 프로젝트`;
    $('index-empty').hidden=selected.length>0;$('load-more').hidden=true;
    updateNavigation();
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter; indexLimit = Infinity;
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
    renderIndex();
  }));
  $('project-search').addEventListener('input',event=>{search=event.target.value;indexLimit=Infinity;renderIndex();});
  function openProjectIndex(category) {
    if(projectDialog.open)closeDialog(false);
    filter=category;search='';indexLimit=Infinity;$('project-search').value='';
    document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
    renderIndex();closeMenu();history.pushState(null,'','#all-work');
    $('all-work').scrollIntoView({behavior:'instant'});
    $('index-title').focus({preventScroll:true});
    if(!reducedMotion.matches)$('project-index').animate([{opacity:.25},{opacity:1}],{duration:220,easing:'ease-out'});
  }
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    view = button.dataset.view;
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
    renderIndex();
  }));
  $('load-more').addEventListener('click', () => { indexLimit += 6; renderIndex(); });

  function figure(ref, caption = '', className = '', extra = '') {
    const index = gallery.push({ref,caption}) - 1;
    return `<figure class="gallery-figure ${className}" ${extra}><button type="button" class="image-button" data-lightbox="${index}" aria-label="${esc(caption || '작품 이미지')} 확대 보기">${asset(ref,caption || '작품 이미지')}</button>${caption?`<figcaption class="image-caption"><span>${esc(caption)}</span></figcaption>`:''}</figure>`;
  }
  function sectionHead(label,title,copy = '') {
    return `<div class="case-section-head"><div><span class="case-section-label">${esc(label)}</span><h2>${title}</h2></div>${copy?`<p>${copy}</p>`:''}</div>`;
  }
  function caseFacts(role,season,subtitle,meta={}) {
    const plain=String(subtitle||'').replace(/<[^>]+>/g,' ').trim();
    const rows=[['Season',meta.season||season],['Role',meta.role||role],['Contribution',meta.contribution||role],['Technique',meta.technique||'—'],['Concept',meta.concept||plain||'—']];
    return `<table class="case-facts"><caption class="sr-only">담당 역할과 기여도</caption><colgroup><col class="facts-label-col"><col></colgroup><tbody>${rows.map(([k,v])=>`<tr><th scope="row">${k}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;
  }
  function caseHeader(kicker,title,subtitle,role,season,note,meta={}) {
    return `<div class="case-shell"><div class="case-bar"><button type="button" class="case-back" data-close-case>작업으로 돌아가기</button><a href="#top" class="case-bar-title" data-close-case>eenyminy / ${esc(kicker)}</a><button type="button" class="close-button" data-close-case>닫기 <span aria-hidden="true">×</span></button></div><div class="page-width"><div class="case-top"><div class="case-heading"><span class="case-kicker">${esc(kicker)}</span><h1 id="case-title" tabindex="-1">${title}</h1>${subtitle?`<p class="case-subtitle">${subtitle}</p>`:''}</div><div class="case-facts-block">${caseFacts(role,season,subtitle,meta)}${note?`<p class="case-note">${note}</p>`:''}</div></div></div>`;
  }
  function caseNav(items) {
    return `<nav class="case-anchor-nav" aria-label="이 프로젝트의 구성">${items.map(([id,text])=>`<a href="#case-${id}" data-case-anchor="case-${id}">${text}</a>`).join('')}</nav><div class="page-width case-body">`;
  }
  function caseFooter(id) {
    const index = projects.findIndex(p => p.id === id), next = projects[(index+1+projects.length)%projects.length];
    return `<footer class="case-footer"><button type="button" class="case-list-back" data-close-case>작업 목록으로 돌아가기</button><a href="#project/${next.id}"><small>NEXT PROJECT</small><strong>${esc(next.brand)}</strong></a></footer></div></div>`;
  }
  function naturalGallery(refs,captions=[],cols='',limit=0,key='') {
    const figures=refs.map((ref,i)=>figure(ref,captions[i]||'', '', limit && i>=limit ? 'hidden' : '')).join('');
    return `<div class="gallery-grid ${cols}" ${key?`data-more-gallery="${key}"`:''}>${figures}</div>${limit&&refs.length>limit?`<button type="button" class="load-more" data-more="${key}" data-step="${limit}">이미지 더 보기 <span aria-hidden="true">＋</span></button>`:''}`;
  }
  function editorialGallery(refs,captions=[]) {
    return `<div class="lookbook-editorial">${refs.map((ref,i)=>{const info=imageInfo(ref);return figure(ref,captions[i]||'',info.w/info.h>1.25?'landscape':'');}).join('')}</div>`;
  }

  const aiSystemStories={
    casting:[['문제','다양한 룩에서도 같은 모델의 얼굴과 체형을 유지해야 함.'],['방법','인물 기준을 정하고 착장·장면을 확장해 모델별로 정리.'],['결과','모델 14명과 각 인물의 룩을 캐스팅북으로 구성.']],
    dashboard:[['문제','랭킹 데이터를 상품 기획에 활용할 비교 기준이 필요함.'],['방법','무신사 랭킹을 분류·비교하는 대시보드를 AI로 설계·제작.'],['결과','아이템·가격대와 월간 상품 기획을 함께 검토하는 화면으로 구현.']],
    site:[['문제','브랜드·시즌별 작업을 한곳에서 검토할 정리 구조가 필요함.'],['방법','AI와 함께 기획·코드 작성·반응형 화면 구현 및 수정.'],['결과','검색·필터·롤링 상세·모델북을 연결한 포트폴리오 사이트 제작.']]
  };
  function systemFlow(id){return `<dl class="system-flow">${aiSystemStories[id].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;}
  function natAssetsBoard(){
    const b=data.natBrandAssets;
    return `<section class="case-section brand-assets-board" id="case-assets"><div class="brand-assets-heading"><span class="kicker">N.A.T / 27SS</span><h2>BRAND ASSETS</h2><p>${esc(b.description)}</p></div>
      <div class="nat-asset-sequence"><div class="nat-asset-cell nat-asset-slogan"><h3>Slogan</h3><p>${esc(b.slogan)}</p></div>
      <figure class="nat-asset-cell nat-asset-symbol"><figcaption>Symbol</figcaption><img src="img/nat/symbol.png" alt="N.A.T 해·초승달 결합 심볼 원본"></figure>
      <figure class="nat-asset-cell nat-asset-signature"><figcaption>Signature</figcaption><img src="img/nat/signature.png" alt="Now and tomorrow 시그니처 원본"></figure>
      <figure class="nat-asset-cell nat-asset-story"><figcaption>Story symbol</figcaption><img src="img/nat/story.png" alt="해·달·고양이를 전개한 스토리 심볼 원본"></figure>
      <div class="nat-asset-cell nat-asset-colors"><h3>Color</h3><div class="nat-color-swatches">${b.colors.map(([name,hex])=>`<div><span style="background:${hex}"></span><small>${name}<br>${hex}</small></div>`).join('')}</div></div>
      <div class="nat-asset-cell nat-asset-rules"><h3>Core rules</h3><p class="asset-rule-note">라벨·태그 적용 기준</p><ul>${b.rules.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>
      <div class="nat-credit-split"><div><h3>Brand Direction <span>(실장님)</span></h3><p>${esc(b.direction)}</p></div><div><h3>Visual Design <span>(최혜정)</span></h3><p>${esc(b.visual)}</p></div></div></section>`;
  }

  function natCase(){return magazineNat();}

  const sourceArtSections = {
    'oh-vd':{t:'ORIGINAL ARTWORK',sub:'2025 / HOTEL LOOKBOOK',art:true,items:[['ed/vd-art-0.webp','협업 그래픽 · 레터링과 장식 모티프'],['ed/vd-art-1.webp','협업 그래픽 · 빈티지 핑크'],['ed/vd-art-2.webp','협업 그래픽 · 레이스 패턴'],['ed/vd-art-3.webp','브랜드 레터링 조합']]},
    'oh-vd24':{t:'ORIGINAL ARTWORK',sub:'2024 / PINK EDITION',art:true,items:[['ed/vd-art-6.webp','협업 상품 그래픽 · 질감과 레터링'],['ed/vd-art-5.webp','Ordinary Holiday · 아웃라인 레터링'],['ed/vd-tag.webp','협업 상품 그래픽 · 질감 전개'],['ed/vd-art-4.webp','Ordinary Holiday × Von Dutch · 콜라보 택']]}
  };
  function curatedCase(p){
    const e=window.PORTFOLIO_EDITION[p.id];
    let html=caseHeader(e.kicker,e.title,e.subtitle,p.role,p.season,e.note,p.caseMeta);
    html+=caseNav(e.sections.map(s=>[s.id,s.nav || s.title.replace(/<br\s*\/?>/g,' ').replace(/<[^>]+>/g,'').replace(/\.$/,'')]));
    for(const s of e.sections){
      html+=`<section class="case-section curated-section layout-${s.layout}" id="case-${s.id}">${sectionHead(s.label,s.title,esc(s.copy))}`;
      const refs=s.refs,caps=s.caps;
      if(s.layout==='spread'||s.layout==='art-product')html+=editorialGallery(refs,caps);
      else if(s.layout==='archive')html+=`<details class="artwork-details"><summary>부위별 도안 ${refs.length}장 펼쳐 보기</summary>${naturalGallery(refs,caps,'three')}</details>`;
      else html+=`<div class="curated-gallery ${s.layout}">${refs.map((ref,i)=>figure(ref,caps[i]||'제작 도안')).join('')}</div>`;
      html+='</section>';
    }
    if(e.appendExisting){
      const refs=(p.secs||[]).filter(s=>!/^MOOD$|KNIT JACQUARD/.test(s.t)).flatMap(s=>s.items);
      html+=`<section class="case-section"><details class="artwork-details"><summary>꼬모니노즈의 다른 상품 그래픽 보기</summary>${naturalGallery(refs.map(r=>r[0]),refs.map(r=>r[1]),'three',12,'cm-more')}</details></section>`;
    }
    if(e.appendArchive){
      for(const sec of (p.secs||[]).filter(sec=>/2025 FW/.test(sec.t))){
        html+=`<section class="case-section"><details class="artwork-details"><summary>2025 FW 그래피티 레터링 보기</summary>${naturalGallery(sec.items.map(r=>r[0]),sec.items.map(r=>r[1]),'three',12,'op-fw')}</details></section>`;
      }
    }
    return html+caseFooter(p.id);
  }

  function generalCase(p) {
    if(p.collageSpreads)return textileCollageCase(p);
    const textile=p.category==='textile', analytics=p.category==='data';
    const role=p.role;
    const note=analytics?'공개 랭킹을 분석해 상품 구성·소재·컬러를 제안한 기획 시뮬레이션입니다.':textile?'담당: 텍스타일 패턴 개발과 컬러웨이. 상품 이미지는 패턴의 적용 맥락을 보여주는 기존 자료입니다.':'담당: 상품 그래픽 디자인'+(p.brand.includes('VON DUTCH')?' 및 협업 로고. 상세페이지는 레이아웃 보조 작업입니다.':'.')+' 브랜드 룩북과 상품 사진은 그래픽의 적용 맥락을 보여주는 기존 자료입니다.';
    let html=caseHeader(p.brand,esc(p.title),esc(p.tech),esc(role),p.id==='texworld'?'2022.12 – 2024.02':p.season,note,p.caseMeta);
    let sections=[...(p.secs||[])];
    const sourceArt=sourceArtSections[p.id];if(sourceArt){const at=sections.findIndex(s=>/LOOKBOOK/.test(s.t));sections.splice(at<0?0:at+1,0,sourceArt);}
    if(p.book)sections=[{t:'TEXTILE PORTFOLIO BOOK',sub:'기존 텍스타일 작업집',items:[]}];
    if(!sections.length)sections=[{t:'GRAPHIC / PRODUCT',sub:p.tech,items:(p.imgs||[]).map(ref=>[ref,''])}];
    let contents=[];
    if(textile){contents=[['s0',p.book?'텍스타일 작업집':'패턴·상품 적용']];const process=sections.findIndex(s=>/PROCESS/.test(s.t));if(process>0)contents.push([`s${process}`,'작업 과정']);}
    else if(analytics)contents=[['s0','대시보드 화면']];
    else{const mood=sections.findIndex(s=>/LOOKBOOK|^MOOD$/.test(s.t));if(mood>=0)contents.push([`s${mood}`,'룩북']);const detail=sections.findIndex((s,i)=>i!==mood&&!s.art);if(detail>=0)contents.push([`s${detail}`,'상품 그래픽·디테일']);const original=sections.findIndex(s=>s.art);if(original>=0)contents.splice(1,0,[`s${original}`,'그래픽 원본']);}
    if(p.contents)contents=p.contents;
    html+=caseNav(contents);
    for(let i=0;i<sections.length;i++){
      const sec=sections[i], refs=sec.items.map(item=>item[0]), captions=sec.items.map(item=>item[1]);
      const sectionTitle=sec.t==='LOOKBOOK'?'룩북':sec.t==='MOOD'?'브랜드 무드':sec.t==='ORIGINAL ARTWORK'?'그래픽 원본':sec.t;
      html+=`<section class="case-section" id="case-${sec.id||`s${i}`}">${sectionHead(sec.sub||p.season,esc(sectionTitle),'')}`;
      if(sec.art){html+=`<div class="original-art-gallery">${naturalGallery(refs,captions)}</div>`;}else if(p.book){
        const pages=p.bookPages || ['bk/c0.jpg','bk/p1.jpg','bk/c1.jpg'];html+=naturalGallery(pages,[],'',18,'textile-book');
      }else if(/LOOKBOOK|^MOOD$/.test(sec.t))html+=editorialGallery(refs,captions);
      else html+=naturalGallery(refs,captions,analytics?'':refs.length>10?'three':'',refs.length>18?18:0,`section-${i}`);
      html+='</section>';
    }
    if(analytics){const url=p.id==='dash26'?'https://claude.ai/artifact/W37BT8qaXu7NQG1utdKHoG':'https://claude.ai/artifact/3mZ97i5C6XnySQKcgR2ui9';html+=`<p class="case-note">${esc(note)}</p><p style="margin-top:25px"><a class="text-link" href="${url}" target="_blank" rel="noopener noreferrer">기존 라이브 대시보드 열기 <span class="link-plus" aria-hidden="true">＋</span></a></p>`;}
    return html+caseFooter(p.id);
  }

  // Editorial layouts share navigation and original asset rendering, not a fixed page template.
  function still(ref, caption='', className='') {
    return `<figure class="story-photo ${className}">${asset(ref,caption||'작품 이미지')}${caption?`<figcaption>${esc(caption)}</figcaption>`:''}</figure>`;
  }
  function storyHeading(title, small='') {
    return `<div class="story-heading"><h2>${title}</h2>${small?`<p>${esc(small)}</p>`:''}</div>`;
  }
  function storySpread(refs,caps=[],style='offset') {
    return `<div class="story-spread spread-${style}">${refs.map((ref,i)=>still(ref,caps[i]||'',`photo-${i+1}`)).join('')}</div>`;
  }
  function storySequence(refs,caps=[],flavour='fashion') {
    let html='';
    for(let i=0;i<refs.length;){
      const info=imageInfo(refs[i]);
      if(info.w/info.h>1.4){html+=storySpread([refs[i]],[caps[i]||''],'wide');i++;continue;}
      const remaining=refs.length-i;
      const style=flavour==='sport'?(['pair','wide','offset'][Math.floor(i/2)%3]):(['offset','pair','quiet','wide'][Math.floor(i/2)%4]);
      const n=style==='wide'||remaining===1?1:2;
      html+=storySpread(refs.slice(i,i+n),caps.slice(i,i+n),style);i+=n;
    }
    return html;
  }
  function magazineHeader(p,title,theme='',subtitle='') {
    const role=p.category==='textile'?'Textile Design':p.category==='touchpoint'?'Graphic Design':'Graphic Design';
    return caseHeader(p.brand,title,subtitle,role,p.season,'',p.caseMeta).replace('class="case-shell"',`class="case-shell magazine ${theme}"`);
  }
  function storyCredit(p,note='') {
    return `<p class="story-credit">${esc(p.role)} · ${esc(p.season)}${note?`<br>${esc(note)}`:''}</p>`;
  }
  function hotelCase(p){
    let html=magazineHeader(p,'Ordinary Holiday<br>× Von Dutch','theme-hotel','Hotel lookbook · 2025 SS');
    html+=caseNav([['hotel','Hotel lookbook'],['collection','Collection']]);
    html+=`<section class="case-section hotel-opening" id="case-hotel"><img class="hotel-signature" src="img/ed/oh-script.png" alt="Ordinary Holiday 원본 레터링">${still(8,'','hotel-small')}${still(71,'','hotel-large')}<span class="hotel-season">2025 SS</span></section>`;
    html+=`<section class="case-section hotel-lace-spread">${still(3,'','hotel-campaign')}<div class="hotel-lace">${asset('ed/oh-lace.png','Von Dutch 원본 레이스 그래픽')}<p>Ordinary Holiday<br>× Von Dutch</p></div></section>`;
    html+=`<section class="case-section">${storySpread([4,'oh/vd_lb_halter.jpg'],[],'pair')}${storySpread([6],[],'quiet')}${storySpread([54,'oh/vd_lb_pants.jpg'],[],'offset')}</section>`;
    html+=`<section class="case-section story-collection" id="case-collection">${storyHeading('The collection.','2025 SS')}`;
    for(const [i,s] of p.secs.slice(1).entries()){
      html+=`<section class="story-product-chapter">${storyHeading(esc(s.t.split(' — ')[0]).toLowerCase(),s.sub)}${storySequence(s.items.map(x=>x[0]),[],'fashion')}</section>`;
    }
    html+=`</section>${storyCredit(p,'상품 그래픽·협업 로고 디자인 / 브랜드 룩북 및 상품 사진 사용.')}`;
    return html+caseFooter(p.id);
  }
  function natBookPanels(){
    return `<section class="case-section nat-book-panel nat-book-black" id="case-identity"><div class="nat-book-symbol"></div><span class="book-caption">NOW AND TOMORROW</span></section>
    <section class="case-section nat-book-panel nat-book-lockup"><div class="nat-book-symbol"></div><div class="nat-book-signature"></div><p>Now and tomorrow.</p></section>
    <section class="case-section nat-time-panel" id="case-system"><div class="nat-time-meta"><span>NAT Time Gradient</span><span>Day · Dusk · Night</span></div><div class="nat-time-arrangement"><figure class="nat-time-n"><img src="img/ed/nat-n-ink.png" alt="N 모노그램과 심볼 원본"></figure><figure class="nat-time-label">${asset('nat/label.jpg','메인 직조라벨')}<figcaption>메인 직조라벨</figcaption></figure><figure class="nat-time-pants">${asset('nat/label_pants.jpg','바지 메인 라벨')}<figcaption>바지 메인 라벨</figcaption></figure><figure class="nat-time-metal"><img src="img/ed/nat-metal-cutout.png" alt="원본 사진에서 배경을 제거한 금속 태그"><figcaption>금속 태그</figcaption></figure></div></section>`;
  }
  function magazineNat(){
    const p=projects.find(p=>p.id==='nat');
    let html=magazineHeader(p,'N.A.T','theme-nat','Brand assets · 2027 SS');
    html+=caseNav([['assets','Brand assets'],['identity','Brandbook'],['system','Labels'],['product','Collection'],['graphics','Graphics']]);
    html+=natAssetsBoard();
    html+=natBookPanels();
    html+=`<section class="case-section nat-detail-story">${storySpread(['nat/label_point.jpg','nat/label_neck_m.jpg'],['포인트 라벨','넥라벨 적용'],'offset')}${storySpread(['nat/tag_metal_m.jpg','nat/story.png'],['금속 태그 시안','Story symbol'],'pair')}<a class="text-link" href="nat.html">N.A.T 브랜드북 전체 보기 ＋</a></section>`;
    html+=`<section class="case-section" id="case-product">${storyHeading('The collection.','2027 SS · 상품 개발 시안')}`;
    const productBlock=(product)=>`<section class="nat-product-story"><div class="nat-product-caption"><h3>${esc(product.name)}</h3><span>2027 SS</span></div><div class="nat-product-pair">${product.refs.map((r,j)=>still(r,j===0?'Front':'Back')).join('')}</div></section>`;
    const featured=[21,18,28].map(tile=>p.productStories.find(x=>x.tile===tile)).filter(Boolean);
    html+=`<div class="nat-featured-products">${featured.map(productBlock).join('')}</div>`;
    html+=`<div class="nat-group-heading"><h2>NAT. 27SS</h2><p>기획상품 · 반팔 2종</p></div><div class="nat-planning-pair">${p.planningProducts.map((x,i)=>still(x.refs[0],i===0?'A · Now and tomorrow':'B · Wear NOW, Keep for TOMORROW.')).join('')}</div>`;
    html+=`<section class="nat-women-group"><div class="nat-group-heading"><h2>Women</h2><p>여성전용 · 4 styles</p></div><div class="nat-women-products">${p.productStories.filter(x=>x.group==='women').map(productBlock).join('')}</div></section>`;
    html+=`<div class="nat-group-heading"><h2>More from the collection.</h2><p>2027 SS · 상품 그래픽</p></div>`;
    const selected=[8,11,13,16,20,22];
    html+=p.productStories.filter(x=>selected.includes(x.tile)).map(productBlock).join('');
    const archive=p.productStories.filter(x=>x.group!=='women'&&![21,18,28,...selected].includes(x.tile));
    html+=`<details class="artwork-details"><summary>컬렉션 더 보기</summary><div class="nat-archive-products">${archive.map(productBlock).join('')}</div></details></section>`;
    html+=`<section class="case-section" id="case-graphics">${storyHeading('Original graphics.')}${storySpread(['nat/sig_crack.jpg','nat/sym_var.jpg'],[],'pair')}<details class="artwork-details"><summary>시즌 그래픽 보기</summary>${naturalGallery(p.imgs.filter(r=>typeof r==='string'&&r.startsWith('nat/e/')),[],'three',12,'nat-graphics')}</details></section>`;
    html+=`<section class="case-section" id="case-material"><details class="artwork-details"><summary>소재·제작 가이드</summary><div class="nat-wear-story">${storySpread(['ed/nat-wear-1.webp','ed/nat-wear-9.webp'],['AI 착장 시안','AI 착장 시안'],'offset')}</div>${naturalGallery(['nat/c/ai_cat.jpg','nat/c/size.jpg','nat/c/spec.jpg','nat/c/ai_pacman.jpg'],['AI 소재·가공 시안','실제 규격','작업지시서','소재 표현 시안'])}</details></section>${storyCredit(p,'브랜드 그래픽 및 2027 SS 개발 프로젝트. 착장 이미지는 AI 합성 시안입니다.')}`;
    return html+caseFooter('nat');
  }
  function magazineCurated(p){
    const e=window.PORTFOLIO_EDITION[p.id];
    const theme=p.id==='lilcherry'?'theme-cherry':p.id==='oh-invite'?'theme-invite':p.id==='ee-open'?'theme-retail':p.id==='cmnz'?'theme-como':'theme-ocean';
    let html=magazineHeader(p,e.title,theme);
    const chapterNav=e.sections.filter(s=>s.layout!=='archive').map(s=>[s.id,s.nav||s.label]);
    if(p.id==='cmnz')chapterNav.splice(3,0,['labels','라벨·택']);
    html+=caseNav(chapterNav);
    if(p.id==='cmnz')html+=`<section class="case-section case-cover">${storySpread([p.cover,'cm/fw25_lb1.jpg'],[],'offset')}</section>`;
    for(const [i,s] of e.sections.entries()){
      if(s.id==='proposal'){
        html+=`<section class="case-section"><details class="artwork-details"><summary>레터링 개발 과정</summary>${naturalGallery(s.refs,s.caps)}</details></section>`;continue;
      }
      const refs=s.refs,caps=s.caps||[];
      const title=s.id==='wear'?'Worn in real life.':s.id==='knit'?'The knit story.':s.id==='poster'?'In store.':s.id==='invitation'?'You’re invited.':s.title;
      html+=`<section class="case-section story-chapter ${s.layout==='art'?'art-chapter':''}" id="case-${s.id}">${i?storyHeading(title):''}`;
      if(s.layout==='archive'||s.id==='production')html+=`<details class="artwork-details"><summary>제작 원본 보기</summary>${naturalGallery(refs,caps,'three')}</details>`;
      else if(s.layout==='art')html+=`<div class="story-art-pair">${refs.map((r,j)=>still(r,caps[j]||'')).join('')}</div>`;
      else if(s.layout==='knit')html+=storySpread([refs[0]],['고객 착용 스냅 / 무신사'],'quiet')+storySpread(refs.slice(1,3),[],'pair')+storySpread([refs[3]],['Beige'],'quiet');
      else if(s.layout==='technical')html+=`<div class="story-technical">${refs.map((r,j)=>still(r,caps[j]||'')).join('')}</div>`;
      else if(s.layout==='art-product')html+=storySpread(refs,caps,'pair');
      else if(s.layout==='wide'||s.layout==='single')html+=storySpread(refs,caps,'quiet');
      else html+=storySequence(refs,caps,p.id==='ee-open'?'retail':'fashion');
      html+='</section>';
    }
    if(e.appendExisting){
      const other=p.secs.filter(s=>!/^MOOD$|KNIT JACQUARD/.test(s.t));
      for(const s of other){
        const detail=s.applicationDetails;
        const details=detail?`<div class="cmnz-application-details cmnz-details-${detail.kind}" id="case-${detail.id}">${detail.items.map(([ref,caption],i)=>still(ref,caption,i?'folded-label':'primary-label')).join('')}</div>`:'';
        html+=`<section class="case-section story-product-chapter">${storyHeading(esc(s.t.split(' — ')[1]||s.t).toLowerCase(),s.sub)}${storySequence(s.items.map(x=>x[0]),[])}${details}</section>`;
      }
    }
    if(e.appendArchive){
      for(const s of p.secs.filter(s=>/2025 FW/.test(s.t)))html+=`<section class="case-section">${storyHeading('Graffiti lettering.','2025 FW')}${storySequence(s.items.slice(0,6).map(x=>x[0]),[])}<details class="artwork-details"><summary>그래픽 더 보기</summary>${naturalGallery(s.items.slice(6).map(x=>x[0]),[],'three')}</details></section>`;
    }
    return html+storyCredit(p,e.note)+caseFooter(p.id);
  }
  function golaCase(p){
    let html=magazineHeader(p,'GOLA','theme-gola',p.title);
    const books=p.secs.filter(s=>s.t==='LOOKBOOK');
    html+=caseNav([['campaign','Campaign'],['collection','Collection'],...(p.halftone?[['halftone','Halftone']]:[])]);
    html+=`<section class="case-section gola-intro" id="case-campaign"><div class="gola-issue"><span>${esc(p.season)}</span><p>${esc(p.title)}</p></div>${storySpread([p.cover],[],'wide')}</section>`;
    for(const [i,b] of books.entries()){
      const refs=b.items.map(x=>x[0]).filter(r=>r!==p.cover);
      html+=`<section class="case-section gola-lookbook" id="${i?'case-autumn':'case-winter'}">${i?storyHeading('Autumn.',p.season):''}${storySequence(refs,[],'sport')}</section>`;
    }
    html+=`<section class="case-section" id="case-collection">${storyHeading('GRAPHICS<br>& DETAILS.')} </section>`;
    for(const [i,s] of p.secs.filter(s=>s.t!=='LOOKBOOK').entries()){
      html+=`<section class="case-section story-product-chapter ${i%3===2?'gola-dark':''}">${storyHeading(esc(s.t.split(' — ')[1]||s.t),s.sub)}${storySequence(s.items.map(x=>x[0]),[],'sport')}</section>`;
    }
    if(p.halftone){
      html+=`<section class="case-section gola-halftone" id="case-halftone">${storyHeading('HALFTONE<br>IN MOTION.','2024 FW')}${storySpread(p.halftone[0].refs.slice(0,2),p.halftone[0].caps.slice(0,2),'offset')}${p.halftone[0].refs.length>2?storySpread(p.halftone[0].refs.slice(2),p.halftone[0].caps.slice(2),'quiet'):''}<div class="story-technical">${p.halftone[1].refs.map((r,i)=>still(r,p.halftone[1].caps[i])).join('')}</div><details class="artwork-details"><summary>전체 제작 도안</summary><div class="story-technical">${p.halftone[2].refs.map((r,i)=>still(r,p.halftone[2].caps[i])).join('')}</div></details></section>`;
    }
    return html+storyCredit(p)+caseFooter(p.id);
  }
  function textileCollageCase(p){
    let html=magazineHeader(p,esc(p.title),'theme-textile theme-textile-a3',esc(p.collageFormat));
    const archive=p.book?'s0':'collection';
    html+=caseNav([['lookbook','Overview'],[archive,'A3 spreads']]);
    html+=`<section class="case-section textile-a3-overview" id="case-lookbook">${storySpread([p.cover],[],'quiet')}</section>`;
    html+=`<section class="case-section textile-a3-archive" id="case-${archive}">${storyHeading('A3 spreads.',p.collageFormat)}${naturalGallery(p.collageSpreads.map(x=>x[0]),p.collageSpreads.map(x=>x[1]),'textile-a3-gallery',p.book?12:0,'textile-a3-'+p.id)}</section>`;
    return html+storyCredit(p)+caseFooter(p.id);
  }
  function magazineGeneral(p){
    if(p.collageSpreads)return textileCollageCase(p);
    if(p.category==='data'||p.book)return generalCase(p);
    let html=magazineHeader(p,esc(p.title),p.category==='textile'?'theme-textile':'theme-fashion');
    html+=caseNav([['lookbook',p.category==='textile'?'Campaign & textile':'Lookbook'],['collection','Collection']]);
    if(p.id==='eland'){
      const first=p.secs[0];html+=`<section class="case-section" id="case-lookbook">${storyHeading('Snow White.','ROEM × DISNEY')}${storySpread([p.cover],[],'quiet')}${storySpread([first.items[0][0],first.items[2][0]],[],'offset')}</section>`;
    }else{
      const book=p.secs?.find(s=>/LOOKBOOK|^MOOD$/.test(s.t));
      html+=`<section class="case-section" id="case-lookbook">${storySequence(book?book.items.map(x=>x[0]):[p.cover],[])}</section>`;
    }
    html+=`<section class="case-section" id="case-collection">`;
    const secs=(p.secs||[]).filter(s=>!(/LOOKBOOK|^MOOD$/.test(s.t)));
    if(p.id==='oh-vd24'){
      const a=sourceArtSections[p.id];html+=`<section class="story-product-chapter">${storyHeading('Original lettering.')}<div class="story-art-pair">${a.items.map(x=>still(x[0],x[1])).join('')}</div></section>`;
    }
    for(const [i,s] of secs.entries()){
      if(p.id==='eland'&&i===0)continue;
      if(/DETAIL PAGE/.test(s.t)){html+=`<section class="story-product-chapter" id="case-digital-intro">${storyHeading('Digital introduction.','상세페이지 인트로 · 레이아웃 보조')}${storySpread(s.items.map(x=>x[0]),[],'quiet')}</section>`;continue;}
      if(s.t==='PROCESS'){html+=`<details class="artwork-details"><summary>${s.t==='PROCESS'?'작업 과정':'상세페이지 디자인'}</summary>${naturalGallery(s.items.map(x=>x[0]),[],'three')}</details>`;continue;}
      html+=`<section class="story-product-chapter" id="case-s${p.secs.indexOf(s)}">${storyHeading(esc(s.t),s.sub)}${storySequence(s.items.map(x=>x[0]),p.category==='textile'?s.items.map(x=>x[1]):[])}</section>`;
    }
    html+='</section>';
    return html+storyCredit(p)+caseFooter(p.id);
  }
  function asCase(p){
    const e=window.PORTFOLIO_EDITION.as;
    let html=magazineHeader(p,e.title,'theme-as',e.subtitle);
    html+=caseNav(e.sections.map(s=>[s.id,s.nav]));
    for(const s of e.sections){
      const r=s.refs,c=s.caps||[];
      html+=`<section class="case-section story-chapter as-${s.layout}" id="case-${s.id}">${storyHeading(esc(s.title),s.copy)}`;
      if(s.layout==='offset')html+=storySpread(r,c,'offset');
      else if(s.layout==='identity')html+=storySpread([r[0],r[1]],[c[0],c[1]],'pair')+`<div class="gallery-grid three">${r.slice(2).map((x,i)=>figure(x,c[i+2])).join('')}</div>`;
      else if(s.layout==='sheets')html+=r.map((x,i)=>storySpread([x],[c[i]],'wide')).join('');
      else if(s.layout==='series')html+=`<div class="story-technical">${r.slice(0,4).map((x,i)=>still(x,c[i])).join('')}</div>`+storySpread(r.slice(4),c.slice(4),'pair');
      else if(s.layout==='four')html+=`<div class="story-technical">${r.map((x,i)=>still(x,c[i])).join('')}</div>`;
      else if(s.layout==='pair')html+=storySpread(r,c,'offset');
      else if(s.layout==='three'||s.layout==='cards')html+=`<div class="gallery-grid three">${r.map((x,i)=>figure(x,c[i])).join('')}</div>`;
      else if(s.layout==='goods')html+=storySpread([r[0]],[c[0]],'wide')+storySpread([r[1]],[c[1]],'wide')+storySpread(r.slice(2),c.slice(2),'pair');
      else html+=storySpread(r,c,s.layout==='single'?'quiet':'wide');
      html+='</section>';
    }
    return html+storyCredit(p,e.note)+caseFooter(p.id);
  }
  function magazineCase(p){
    if(p.id==='as')return asCase(p);
    if(p.id==='oh-vd')return hotelCase(p);
    if(p.brand==='GOLA')return golaCase(p);
    if(window.PORTFOLIO_EDITION?.[p.id])return magazineCurated(p);
    return magazineGeneral(p);
  }

  function aiOverview() {
    let html=caseHeader('AI VISUAL / CASTING ARCHIVE','Choose your<br><em>point of view.</em>','14명의 인물, 각자의 스타일과 장면.','AI 인물 생성 · 스타일링 및 장면 구성','—','모든 인물은 AI 생성 이미지입니다. 인물의 이름과 신장·스타일은 가상 캐스팅 설정입니다.',{season:'—',role:'AI 모델 캐스팅·룩 생성 워크플로우 설계',contribution:'일관된 얼굴과 체형을 기준으로 모델 14명과 모델별 룩을 구성',technique:'AI 인물 생성 · 기준 이미지 · 착장·장면 확장 · 모델별 아카이브',concept:'같은 인물을 서로 다른 착장과 장면으로 전개.'}).replace('<dt>PERIOD</dt>','<dt>ARCHIVE</dt>');
    html+=`<div class="page-width case-body">${systemFlow('casting')}<p class="casting-intro">관심 있는 인물을 골라보세요. 각 인물의 스타일링과 장면으로 이어집니다.</p><div class="casting-mosaic expanded balanced">${models.map(m=>`<a class="cast-tile " href="#model/${m.id}" aria-label="${m.id} 모델북 ${m.count}장 보기"><img src="${esc(m.portrait)}" alt="${m.id} AI 모델" width="896" height="1200" loading="lazy"><span>${m.id}</span></a>`).join('')}<a class="cast-directory" href="#model/TOMMY"><strong>TOMMY</strong><span>룩 16컷<br>스타일링 보기 ＋</span></a></div>`;
    html+=`<section class="case-section">${sectionHead('FEATURED / TOMMY · JUHYE','AI casting.<br><em>Different scenes.</em>','서로 다른 인물의 스타일링과 장면을 소개합니다.')}<div class="lookbook-editorial">${figure({model:'TOMMY',look:2},'TOMMY / AI GENERATED')}${figure({model:'JUHYE',look:2},'JUHYE / AI GENERATED')}</div><a class="model-editorial-link" href="#model/TOMMY">TOMMY 모델북 보기 ＋</a><a class="model-editorial-link" href="#model/JUHYE">JUHYE 모델북 보기 ＋</a></section>`;
    return html+caseFooter('nat');
  }
  function modelCase(id) {
    const model=models.find(m=>m.id===id);
    if(!model)return aiOverview();
    let html=caseHeader('AI MODEL / '+model.id,model.id,esc(model.description),'AI 인물 생성 · 장면 및 스타일 확장',`${model.count} LOOKS / ${model.meta}`,'AI 인물의 다양한 스타일링과 장면을 모았습니다.',{season:'—',role:'AI 인물 생성·장면·스타일링',contribution:`${id}의 인물 기준을 유지하며 착장과 장면을 전개`,technique:'AI 생성 · 인물 참조 · 착장·장면 확장',concept:'한 인물의 스타일링과 장면을 모델북으로 정리.'}).replace('<dt>PERIOD</dt>','<dt>PROFILE</dt>');
    html+=`<nav class="case-anchor-nav" aria-label="AI 아카이브 탐색"><a href="#project/ai">전체 모델북</a>${models.filter(m=>m.id!==id).map(m=>`<a href="#model/${m.id}">${m.id}</a>`).join('')}</nav><div class="page-width case-body"><div class="model-feature"><img src="${esc(model.portrait)}" alt="${id} AI 포트레이트"><div class="model-feature-look">${asset({model:id,look:Math.min(2,model.count-1)},`${id} 대표 스타일링`,true)}</div></div><section class="case-section"><div class="model-looks-grid">${Array.from({length:model.count},(_,i)=>figure({model:id,look:i},`${id} / AI GENERATED`)).join('')}</div></section>`;
    return html+caseFooter('nat');
  }

  function brandIntroduction() {
    let html=caseHeader('eenyminy / 최혜정','어떤 것을<br><em>고를까요?</em>','디자이너 최혜정의 시선과 선택을 담은 포트폴리오 브랜드.','포트폴리오 기획·디자인·AI 활용 제작','—','',{season:'—',role:'기획·비주얼 디자인·AI 활용 제작',contribution:'프로젝트 분류, 화면 구성, 코드 수정과 검토를 AI와 함께 진행',technique:'HTML · CSS · JavaScript · AI 활용',concept:'브랜드·제품·AI 작업을 하나의 포트폴리오로 연결.'}).replace('<dt>ROLE</dt>','<dt>DESIGNER</dt>').replace('<dt>PERIOD</dt>','<dt>BRAND</dt>');
    html+=caseNav([['name','이름과 로고'],['designer','디자이너 최혜정'],['system','AI 제작 과정'],['fields','작업 분야']]);
    html+=`<section class="case-section" id="case-name"><div class="brand-intro-logo"><img src="brand/eenyminy.svg" alt="eenyminy 소문자 워드마크"></div>${sectionHead('NAME / IDENTITY','어느 것을 고를까요?','eenyminy는 무언가를 고르는 놀이에서 시작한 이름입니다. 서로 다른 작업을 하나씩 살펴보며, 그 안에 담긴 디자이너의 시선과 선택을 발견하는 공간을 만들고자 했습니다.')}<div class="brand-story-copy"><p>하나의 분야에 머무르기보다, 작업에 필요한 표현을 선택하고 연결합니다. 텍스타일의 패턴, 의류의 그래픽, 브랜드의 시각 언어, AI로 구성한 장면까지. 이곳의 다양한 작업은 최혜정이라는 한 사람의 시선으로 이어집니다.</p><p>소문자로 이어지는 부드러운 형태는 이름의 친근한 리듬을 담습니다. 선명한 글자 주변의 은은한 빛은, 정돈된 구조 안에서도 표현의 가능성을 열어두려는 이 사이트의 분위기와 연결됩니다.</p></div></section>`;
    html+=`<section class="case-section" id="case-designer">${sectionHead('ABOUT / DESIGNER','GRAPHIC & BX DESIGNER<br>최혜정입니다.','텍스타일에서 시작해 패션 그래픽, 브랜드의 시각 언어와 AI 비주얼까지 작업의 범위를 넓혀왔습니다. 브랜드의 성격을 읽고, 상품과 사용자가 만나는 장면에 맞는 표현을 만드는 일을 합니다.')}<div class="brand-about"><div><p>이 포트폴리오에서는 결과물과 함께 담당한 역할, 상품 적용, 소재와 디테일을 볼 수 있습니다. 사이트의 구성 역시 어떤 작업을 어디서 볼 수 있는지 쉽게 이해하도록 설계했습니다.</p><a class="contact-link" href="mailto:h8545587@naver.com">h8545587@naver.com</a></div><div class="career-list"><div><span>2024.03 – 현재</span><b>원더플레이스</b><small>패션 그래픽</small></div><div><span>2022.12 – 2024.02</span><b>Texworld</b><small>텍스타일 프리랜서</small></div><div><span>2018.07–2020.02</span><b>이랜드월드 패션연구소</b><small>텍스타일 디자인</small></div><div><span>2013.07–2017.12</span><b>Silk Navi</b><small>텍스타일 디자인</small></div></div></div></section>`;
    html+=`<section class="case-section" id="case-system">${sectionHead('AI / WEBSITE WORKFLOW','포트폴리오 사이트','AI와 함께 기획하고 제작한 현재의 사이트입니다.')}${systemFlow('site')}<p class="system-scope">프로젝트 검색·필터, 롤링 상세와 모델북을 연결했습니다.</p></section>`;
    html+=`<section class="case-section" id="case-fields">${sectionHead('EXPLORE / WORK','무엇을 볼까요?','관심 있는 분야를 고르면 해당 작업 모음으로 이어집니다.')}<nav class="brand-fields" aria-label="소개 페이지에서 작업 분야 선택"><a href="#all-work" data-filter-jump="touchpoint"><strong>브랜드 제작물</strong><span>매장 · 인비테이션 · 디지털 · 협업</span><small>4개 프로젝트 보기 ＋</small></a><a href="#all-work" data-filter-jump="design"><strong>브랜드·상품 그래픽</strong><span>브랜드 시스템 · 의류 그래픽</span><small>10개 프로젝트 보기 ＋</small></a><a href="#all-work" data-filter-jump="textile"><strong>텍스타일</strong><span>패턴 · 컬러웨이 · 상품 적용</span><small>3개 프로젝트 보기 ＋</small></a><a href="#project/ai"><strong>AI 비주얼</strong><span>인물 · 스타일링 · 장면 구성</span><small>14명 모델북 보기 ＋</small></a><a href="#all-work" data-filter-jump="data"><strong>기획·데이터</strong><span>시장 리서치 · 기획 대시보드</span><small>2개 프로젝트 보기 ＋</small></a></nav></section>`;
    return html+`<footer class="case-footer"><button type="button" class="case-list-back" data-close-case>돌아가기</button><a class="text-link" href="#all-work" data-filter-jump="all">전체 프로젝트 보기 <span aria-hidden="true">＋</span></a></footer></div></div>`;
  }

  function showRoute() {
    const match=location.hash.match(/^#(project|model)\/([\w-]+)(?:\/([\w-]+))?$/);
    if(!match){closeDialog(false);return;}
    const type=match[1], id=['gola-a24','gola'].includes(match[2])?'gola-w24':match[2], sub=match[2]==='gola'?'halftone':match[2]==='gola-a24'?'campaign':match[3];
    if(['gola-a24','gola'].includes(match[2]))history.replaceState(history.state,'',`#project/gola-w24/${sub}`);
    if(activeRoute===`${type}/${id}`&&projectDialog.open){if(sub)jumpToSection(sub);return;}
    const p=projects.find(p=>p.id===id);
    if(type==='project'&&!['ai','eenyminy'].includes(id)&&!p){history.replaceState(null,'','#work');closeDialog(false);return;}
    if(!projectDialog.open){savedY=window.scrollY;opener=document.activeElement;homeHash=history.state?.homeHash||'#work';}
    activeRoute=`${type}/${id}`;gallery=[];
    $('case-content').innerHTML=type==='model'?modelCase(id.toUpperCase()):id==='nat'?natCase():id==='ai'?aiOverview():id==='eenyminy'?brandIntroduction():magazineCase(p);
    if(!projectDialog.open)projectDialog.showModal();
    document.body.style.overflow='hidden';
    projectDialog.scrollTo({top:0,behavior:"instant"});
    hydrateImages($('case-content'));
    const title=$('case-title');if(title)title.focus({preventScroll:true});
    requestAnimationFrame(updateCaseNavigation);if(sub)requestAnimationFrame(()=>jumpToSection(sub));
  }
  let caseScrollFrame=false;
  function updateCaseNavigation(){
    const sections=[...document.querySelectorAll('#case-content .case-section[id],#case-content .cmnz-application-details[id]')];
    const current=sections.filter(s=>s.getBoundingClientRect().top<=210).pop()||sections[0];
    document.querySelectorAll('.case-anchor-nav [data-case-anchor]').forEach(a=>{
      const active=a.dataset.caseAnchor===current?.id;a.classList.toggle('is-active',active);
      if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
    });
    caseScrollFrame=false;
  }
  projectDialog.addEventListener('scroll',()=>{if(!caseScrollFrame){caseScrollFrame=true;requestAnimationFrame(updateCaseNavigation);}},{passive:true});
  function jumpToSection(id){const el=document.getElementById('case-'+id);if(el)el.scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth',block:'start'});}
  function navigateCase(href){
    if(!projectDialog.open){homeHash=location.hash||'#work';history.pushState({case:true,homeHash},'',href);}
    else history.replaceState({case:true,homeHash},'',href);
    showRoute();
  }
  function closeDialog(animate=true){
    if(!projectDialog.open||closing)return;
    if(lightbox.open)lightbox.close();
    closing=true;
    const finish=()=>{projectDialog.close();document.body.style.overflow='';activeRoute='';closing=false;window.scrollTo({top:savedY,behavior:'instant'});if(opener&&opener.isConnected)opener.focus({preventScroll:true});};
    if(animate&&!reducedMotion.matches){projectDialog.animate([{opacity:1},{opacity:0}],{duration:180,easing:'ease-out'}).finished.then(finish,finish);}else finish();
  }
  function closeCase(){
    const hasHistory=history.state?.case;
    closeDialog(true);
    if(hasHistory)history.back();else history.replaceState(null,'',homeHash);
  }
  function openLightbox(index){
    galleryIndex=Math.max(0,Math.min(index,gallery.length-1));renderLightbox();
    if(!lightbox.open)lightbox.showModal();
  }
  function renderLightbox(){
    const item=gallery[galleryIndex];if(!item)return;
    $('lightbox-stage').innerHTML=asset(item.ref,item.caption||'작품 원본',true);
    $('lightbox-name').textContent=item.caption||'작품 원본';
    $('lightbox-count').textContent=`${galleryIndex+1} / ${gallery.length}`;
    $('lightbox-prev').disabled=galleryIndex===0;$('lightbox-next').disabled=galleryIndex===gallery.length-1;
    const a=imageInfo(item.ref),svg=$('lightbox-stage').querySelector('.asset-sprite');
    if(svg){const el=svg.parentElement;el.style.width=`min(100%, calc((100dvh - 225px) * ${a.w/a.h}))`;el.style.height='auto';}
  }
  function moveLightbox(direction){const next=galleryIndex+direction;if(next>=0&&next<gallery.length){galleryIndex=next;renderLightbox();}}
  $('lightbox-close').addEventListener('click',()=>lightbox.close());
  $('lightbox-prev').addEventListener('click',()=>moveLightbox(-1));
  $('lightbox-next').addEventListener('click',()=>moveLightbox(1));
  lightbox.addEventListener('click',event=>{if(event.target===$('lightbox-stage'))lightbox.close();});
  lightbox.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();moveLightbox(-1);}if(event.key==='ArrowRight'){event.preventDefault();moveLightbox(1);}});
  projectDialog.addEventListener('cancel',event=>{event.preventDefault();closeCase();});
  document.addEventListener('click',event=>{
    const fieldLink=event.target.closest('[data-filter-jump]');
    if(fieldLink&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();openProjectIndex(fieldLink.dataset.filterJump);return;}
    const close=event.target.closest('[data-close-case]');
    if(close){event.preventDefault();closeCase();return;}
    const anchor=event.target.closest('[data-case-anchor]');
    if(anchor){event.preventDefault();const el=document.getElementById(anchor.dataset.caseAnchor);if(el)el.scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth'});return;}
    const thumb=event.target.closest('[data-lightbox]');
    if(thumb){openLightbox(+thumb.dataset.lightbox);return;}
    const more=event.target.closest('[data-more]');
    if(more){const group=document.querySelector(`[data-more-gallery="${more.dataset.more}"]`);if(!group)return;const hidden=[...group.children].filter(el=>el.hidden);hidden.slice(0,+more.dataset.step).forEach(el=>el.hidden=false);if(hidden.length<=+more.dataset.step)more.hidden=true;hydrateImages(group);return;}
    const link=event.target.closest('a[href]');
    if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const href=link.getAttribute('href');
    if(/^#(?:project|model)\//.test(href)){event.preventDefault();closeMenu();navigateCase(href);return;}
    if(href?.startsWith('#'))closeMenu();
  });
  window.addEventListener('popstate',showRoute);window.addEventListener('hashchange',showRoute);

  const menuButton=document.querySelector('.menu-toggle');
  function closeMenu(){menuButton.setAttribute('aria-expanded','false');$('main-nav').classList.remove('open');}
  menuButton.addEventListener('click',()=>{const opened=menuButton.getAttribute('aria-expanded')==='true';menuButton.setAttribute('aria-expanded',String(!opened));$('main-nav').classList.toggle('open',!opened);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!projectDialog.open)closeMenu();});
  $('back-top').addEventListener('click',()=>window.scrollTo({top:0,behavior:reducedMotion.matches?'auto':'smooth'}));
  let scrollFrame=false;
  function updateNavigation(){
    const marker=innerHeight*.32;
    const active=[...document.querySelectorAll('main>section[id]')].find(el=>{const r=el.getBoundingClientRect();return r.top<=marker&&r.bottom>marker;});
    let id=active?.id||'';
    if(id==='all-work')id=({design:'work',textile:'textile',data:'planning',all:'all-work',touchpoint:'touchpoint'})[filter];
    document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('is-active',a.dataset.nav===id));
  }
  function syncScroll(){
    const max=document.documentElement.scrollHeight-innerHeight;
    document.documentElement.style.setProperty('--page-progress',max>0?String(scrollY/max):'0');
    $('back-top').classList.toggle('visible',scrollY>1200);updateNavigation();scrollFrame=false;
  }
  window.addEventListener('scroll',()=>{if(!scrollFrame){scrollFrame=true;requestAnimationFrame(syncScroll);}},{passive:true});
  window.addEventListener('resize',syncScroll,{passive:true});
  const reveals=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');reveals.unobserve(entry.target);}}),{rootMargin:'0px 0px -30px 0px',threshold:.04});
  document.querySelectorAll('[data-system-flow]').forEach(el=>el.innerHTML=systemFlow(el.dataset.systemFlow));
  hydrateImages();renderIndex();
  document.querySelectorAll('.reveal').forEach(el=>reveals.observe(el));
  if(!reducedMotion.matches)document.documentElement.classList.add('motion-ready');
  syncScroll();showRoute();
})();
