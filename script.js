/* WME Community – pure JS data model via localStorage
   Keys:
   - wmePosts: [{ id, text, media:[{type:'image'|'video', dataUrl}], ts }]
   - wmeDaily: [{ id, title, text, media:[...], ts }]
   - wmeDonations: [{ amount, note, ts, method }]
   - wmeContacts: [{ name, email, message, ts }]
   - wmeMembers: [{ name, email, newsletter, ts }]
*/

(function(){
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const load = (key, fallback=[]) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
  };

  const formatDate = ts => new Date(ts).toLocaleString();

  // Donation modal wiring (exists on all pages)
  const donateBtn = $('#donateBtn');
  const donationModal = $('#donationModal');
  if (donateBtn && donationModal) {
    const closeBtn = donationModal.querySelector('.close');
    const form = $('#donationForm');
    donateBtn.addEventListener('click', () => donationModal.setAttribute('aria-hidden','false'));
    closeBtn.addEventListener('click', () => donationModal.setAttribute('aria-hidden','true'));
    donationModal.addEventListener('click', (e) => {
      if (e.target === donationModal) donationModal.setAttribute('aria-hidden','true');
    });
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat($('#donationAmount').value);
        const note = $('#donationNote').value.trim();
        if (!isNaN(amount) && amount > 0) {
          const donations = load('wmeDonations');
          donations.push({ amount, note, method: 'direct', ts: Date.now() });
          save('wmeDonations', donations);
          form.reset();
          alert('Thank you for supporting WME!');
          donationModal.setAttribute('aria-hidden','true');
        }
      });
      $$('.pay-methods .btn.outline', donationModal).forEach(btn => {
        btn.addEventListener('click', () => alert(`Payment method "${btn.dataset.method}" placeholder.\nWire a processor when ready.`));
      });
    }
  }

  // POSTS page
  const postForm = $('#postForm');
  const postList = $('#postList');
  const loadMoreBtn = $('#loadMore');
  if (postForm && postList) {
    const postText = $('#postText');
    const postMedia = $('#postMedia');
    const clearBtn = $('#clearComposer');
    let posts = load('wmePosts');

    const state = { page: 1, pageSize: 6, filter: 'all' };

    const filterPost = (p) => {
      if (state.filter === 'images') return p.media.some(m => m.type === 'image');
      if (state.filter === 'videos') return p.media.some(m => m.type === 'video');
      return true;
    };

    const renderPosts = () => {
      postList.innerHTML = '';
      const sorted = posts.slice().sort((a,b)=>b.ts - a.ts).filter(filterPost);
      const visible = sorted.slice(0, state.page * state.pageSize);
      visible.forEach(p => {
        const el = document.createElement('article');
        el.className = 'post';
        el.innerHTML = `
          <div class="post-header">
            <strong>${formatDate(p.ts)}</strong>
            <span>${p.media.length ? `${p.media.length} media` : 'Text only'}</span>
          </div>
          <div class="post-text">${escapeHTML(p.text)}</div>
          <div class="post-media">${p.media.map(renderMedia).join('')}</div>
        `;
        postList.appendChild(el);
      });
      if (sorted.length > visible.length) {
        loadMoreBtn.style.display = '';
      } else {
        loadMoreBtn.style.display = 'none';
      }
    };

    const renderMedia = (m) => {
      if (m.type === 'image') return `<img src="${m.dataUrl}" alt="Post image" />`;
      if (m.type === 'video') return `<video src="${m.dataUrl}" controls></video>`;
      return '';
    };

    const escapeHTML = (s) => s.replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"
    })[c]);

    const filesToMedia = async (files) => {
      const arr = [];
      for (const file of files) {
        const dataUrl = await readFile(file);
        const type = file.type.startsWith('image') ? 'image'
                  : file.type.startsWith('video') ? 'video'
                  : 'other';
        if (type !== 'other') arr.push({ type, dataUrl });
      }
      return arr;
    };

    const readFile = (file) => new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

    postForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = (postText.value || '').trim();
      const files = Array.from(postMedia.files || []);
      if (!text && files.length === 0) {
        alert('Add text or media to post.');
        return;
      }
      const media = await filesToMedia(files);
      const post = { id: cryptoRandom(), text, media, ts: Date.now() };
      posts.push(post);
      save('wmePosts', posts);
      postForm.reset();
      state.page = 1; // reset to top
      renderPosts();
    });

    clearBtn?.addEventListener('click', () => postForm.reset());

    $$('.filters .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.filter = btn.dataset.filter;
        state.page = 1;
        $$('.filters .btn').forEach(b=>b.classList.remove('primary'));
        btn.classList.add('primary');
        renderPosts();
      });
    });

    loadMoreBtn?.addEventListener('click', () => {
      state.page++;
      renderPosts();
    });

    renderPosts();
  }

  // DAILY page
  const dailyForm = $('#dailyForm');
  const dailyList = $('#dailyList');
  if (dailyForm && dailyList) {
    const dailyTitle = $('#dailyTitle');
    const dailyText = $('#dailyText');
    const dailyMedia = $('#dailyMedia');
    const clearDaily = $('#clearDaily');
    let daily = load('wmeDaily');

    const escapeHTML = (s) => s.replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"
    })[c]);

    const filesToMedia = async (files) => {
      const arr = [];
      for (const file of files) {
        const dataUrl = await readFile(file);
        const type = file.type.startsWith('image') ? 'image'
                  : file.type.startsWith('video') ? 'video'
                  : 'other';
        if (type !== 'other') arr.push({ type, dataUrl });
      }
      return arr;
    };
    const readFile = (file) => new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

    const renderMedia = (m) => {
      if (m.type === 'image') return `<img src="${m.dataUrl}" alt="Daily image" />`;
      if (m.type === 'video') return `<video src="${m.dataUrl}" controls></video>`;
      return '';
    };

    const renderDaily = () => {
      dailyList.innerHTML = '';
      daily.slice().sort((a,b)=>b.ts - a.ts).forEach(d => {
        const el = document.createElement('article');
        el.className = 'post';
        el.innerHTML = `
          <div class="post-header">
            <strong>${escapeHTML(d.title)}</strong>
            <span>${formatDate(d.ts)}</span>
          </div>
          <div class="post-text">${escapeHTML(d.text)}</div>
          <div class="post-media">${d.media.map(renderMedia).join('')}</div>
        `;
        dailyList.appendChild(el);
      });
    };

    dailyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (dailyTitle.value || '').trim();
      const text = (dailyText.value || '').trim();
      const files = Array.from(dailyMedia.files || []);
      if (!title || !text) {
        alert('Title and text are required.');
        return;
      }
      const media = await filesToMedia(files);
      const item = { id: cryptoRandom(), title, text, media, ts: Date.now() };
      daily.push(item);
      save('wmeDaily', daily);
      dailyForm.reset();
      renderDaily();
    });

    clearDaily?.addEventListener('click', () => dailyForm.reset());

    renderDaily();
  }

  // CONTACT page
  const contactForm = $('#contactForm');
  if (contactForm) {
    const status = $('#contactStatus');
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#contactName').value.trim();
      const email = $('#contactEmail').value.trim();
      const message = $('#contactMessage').value.trim();
      if (!name || !email || !message) return;
      const contacts = load('wmeContacts');
      contacts.push({ name, email, message, ts: Date.now() });
      save('wmeContacts', contacts);
      contactForm.reset();
      status.textContent = 'Message received. We’ll be in touch.';
    });
  }

  // REGISTER page
  const registerForm = $('#registerForm');
  const memberList = $('#memberList');
  if (registerForm) {
    const status = $('#registerStatus');
    let members = load('wmeMembers');
    const renderMembers = () => {
      if (!memberList) return;
      memberList.innerHTML = '';
      members.slice().sort((a,b)=>b.ts - a.ts).slice(0,8).forEach(m=>{
        const li = document.createElement('li');
        li.textContent = `${m.name} • ${m.email}`;
        memberList.appendChild(li);
      });
    };

    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#regName').value.trim();
      const email = $('#regEmail').value.trim();
      const password = $('#regPassword').value; // stored only for demo
      const newsletter = $('#regNewsletter').checked;
      if (!name || !email || !password) return;
      members.push({ name, email, newsletter, ts: Date.now() });
      save('wmeMembers', members);
      registerForm.reset();
      status.textContent = 'Welcome to WME!';
      renderMembers();
    });

    renderMembers();
  }

  // Utility
  function cryptoRandom(){
    // Basic random id; not cryptographically secure across all browsers
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
})();
