'use strict';
const entryDialog = document.querySelector('#entry-notice');
let entryAccepted = false;
try { entryAccepted = sessionStorage.getItem('hari-site-entry') === 'accepted'; } catch {}
const imageObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting || !entryAccepted) continue;
    const image = entry.target;
    image.src = image.dataset.src;
    imageObserver.unobserve(image);
  }
}, {rootMargin:'250px'});
function watchImages() {
  document.querySelectorAll('img[data-src]').forEach(image=>imageObserver.observe(image));
}
function acceptEntry() {
  entryAccepted = true;
  try {sessionStorage.setItem('hari-site-entry','accepted');} catch {}
  document.body.classList.remove('entry-locked');
  if (entryDialog.open) entryDialog.close();
  watchImages();
  document.dispatchEvent(new Event('hari-entry-accepted'));
}
document.querySelector('#accept-entry').addEventListener('click',acceptEntry);
entryDialog.addEventListener('cancel',event=>event.preventDefault());
if (entryAccepted) acceptEntry(); else entryDialog.showModal();

const gallery = document.querySelector('#image-gallery');
if (gallery) {
  let records = [];
  let chosenOutfit = 'all';
  const imageDialog = document.querySelector('#image-dialog');
  function render() {
    imageObserver.disconnect();
    const visible = records.filter(record=>chosenOutfit==='all'||String(record.id)===chosenOutfit);
    gallery.replaceChildren(...visible.map(record=>{
      const figure = document.createElement('figure');
      const button = document.createElement('button');
      button.type='button';
      button.className='gallery-image-button';
      button.setAttribute('aria-label',`${record.name} ${record.number}: ${record.label} 확대 보기`);
      const image = document.createElement('img');
      image.dataset.src=record.url;
      image.alt=record.label;
      image.decoding='async';
      image.addEventListener('error',()=>{
        image.remove();
        const fallback=document.createElement('span');
        fallback.className='missing-image';
        fallback.textContent='등록된 이미지를 불러오지 못했습니다.';
        button.append(fallback);
      });
      button.append(image);
      button.addEventListener('click',()=>{
        document.querySelector('#image-title').textContent=`${record.name} / ${record.number} · ${record.label}`;
        const large=document.querySelector('#large-image');
        large.alt=record.label;
        large.src=record.url;
        imageDialog.showModal();
        document.body.classList.add('dialog-open');
      });
      const caption=document.createElement('figcaption');
      const title=document.createElement('strong');
      title.textContent=`${record.number}. ${record.label}`;
      const meta=document.createElement('span');
      meta.textContent=`${record.name} · ID ${record.id}/${record.number}`;
      caption.append(title,meta);
      figure.append(button,caption);
      return figure;
    }));
    document.querySelector('#gallery-count').textContent=`${visible.length}장`;
    if (entryAccepted) watchImages();
  }
  document.querySelectorAll('[data-outfit]').forEach(button=>button.addEventListener('click',()=>{
    chosenOutfit=button.dataset.outfit;
    document.querySelectorAll('[data-outfit]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    render();
  }));
  fetch('gallery-data.json').then(response=>{if(!response.ok)throw new Error('Gallery data failed');return response.json();}).then(data=>{records=data;render();}).catch(()=>{gallery.textContent='이미지 목록을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';});
  document.querySelector('#close-image').addEventListener('click',()=>imageDialog.close());
  imageDialog.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
}
