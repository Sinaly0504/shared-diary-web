// --- 共享日记 脚本文件 v20.0: 修复点赞功能所有 Bug ---

// =================================================================
// 辅助函数 (Helper Functions)
// =================================================================

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function updateHeaderUI() {
  const authLinksContainer = document.querySelector('.user-auth-links');
  const writeDiaryBtn = document.getElementById('write-diary-btn');
  const token = localStorage.getItem('jwtToken');
  if (token && authLinksContainer) {
    const decodedToken = parseJwt(token);
    if (decodedToken && decodedToken.username) {
      const username = decodedToken.username;
      authLinksContainer.innerHTML = `
        <div class="user-menu">
            <button class="user-menu-trigger">欢迎, ${username} ▼</button>
            <div class="user-menu-dropdown">
                <a href="mydiaries.html">我的日记</a>
                <a href="#" id="logout-link">退出</a>
            </div>
        </div>
      `;
      const trigger = authLinksContainer.querySelector('.user-menu-trigger');
      const dropdown = authLinksContainer.querySelector('.user-menu-dropdown');
      const logoutLink = authLinksContainer.querySelector('#logout-link');
      trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        dropdown.classList.toggle('is-open');
      });
      document.addEventListener('click', () => {
        if (dropdown.classList.contains('is-open')) {
          dropdown.classList.remove('is-open');
        }
      });
      if (logoutLink) {
        logoutLink.addEventListener('click', function(event) {
          event.preventDefault();
          localStorage.removeItem('jwtToken');
          window.location.href = 'index.html';
        });
      }
      if (writeDiaryBtn) writeDiaryBtn.style.display = 'inline-block';
    }
  } else if (authLinksContainer) {
    authLinksContainer.innerHTML = `
      <a href="signup.html">注册</a>
      <a href="login.html">登录</a>
    `;
    if (writeDiaryBtn) writeDiaryBtn.style.display = 'none';
  }
}

function renderDiaries(diaries) {
    const diaryContainer = document.getElementById('diary-container');
    if (!diaryContainer) return;
    diaryContainer.innerHTML = '';
    diaries.forEach(entry => {
        const card = document.createElement('div');
        card.classList.add('diary-card');
        
        const likeButtonClass = entry.user_has_liked ? 'like-button liked' : 'like-button';
        const heartSVG = `
            <svg class="heart-icon" viewBox="0 0 24 24" width="24" height="24" style="fill: currentColor;">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
        `;

        card.innerHTML = `
            <a href="detail.html?id=${entry.id}" class="card-link">
                <div class="card-header">
                    <h2 class="card-title">${entry.title}</h2>
                    <p class="card-content">${entry.content.substring(0, 100)}...</p>
                </div>
            </a>
            <div class="card-footer">
                <span class="author">By: ${entry.username}</span>
                <span class="date">${new Date(entry.created_at).toLocaleDateString()}</span>
            </div>
            <div class="card-actions">
                <button class="${likeButtonClass}" data-diary-id="${entry.id}" data-liked="${entry.user_has_liked}">
                    ${heartSVG}
                </button>
                <span class="like-count">${entry.like_count}</span>
            </div>
        `;
        diaryContainer.appendChild(card);
    });
}

async function loadHomepage() {
    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch('/api/diaries/list', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) throw new Error('获取日记失败');
        const diaries = await response.json();
        renderDiaries(diaries);
    } catch (error) {
        console.error("加载主页数据失败:", error);
        const diaryContainer = document.getElementById('diary-container');
        if (diaryContainer) diaryContainer.innerHTML = '<p>加载日记失败，请稍后刷新重试。</p>';
    }
}

async function loadMyDiaries() {
    const diaryContainer = document.getElementById('diary-container');
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        alert('请先登录才能查看“我的日记”！');
        window.location.href = 'login.html';
        return;
    }
    try {
        const response = await fetch('/api/diaries/mine', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error('获取“我的日记”失败');
        }
        const diaries = await response.json();
        if (diaries.length === 0) {
            diaryContainer.innerHTML = '<p>你还没有发布任何日记，快去写一篇吧！</p>';
        } else {
            renderDiaries(diaries);
        }
    } catch (error) {
        console.error("加载“我的日记”失败:", error);
        if (diaryContainer) diaryContainer.innerHTML = '<p>加载日记失败，请稍后刷新重试。</p>';
    }
}

// =================================================================
// 页面判断与事件监听 (整个应用的“大脑”)
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    updateHeaderUI();

    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
        });
    }

    const diaryContainer = document.getElementById('diary-container');
    const myDiariesTitle = document.querySelector('.page-title');
    const diaryDetailContainer = document.getElementById('diary-detail-container');
    const diaryForm = document.querySelector('.diary-form');
    const editForm = document.getElementById('edit-form');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');

    if (diaryContainer) {
        if (myDiariesTitle) {
            loadMyDiaries();
        } else {
            loadHomepage();
        }
    }
    else if (diaryDetailContainer) {
        const params = new URLSearchParams(window.location.search);
        const diaryId = params.get('id');
        
        async function loadDiaryDetail() {
            const token = localStorage.getItem('jwtToken');
            try {
                const response = await fetch(`/api/diaries/${diaryId}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (!response.ok) throw new Error('日记未找到');
                const diary = await response.json();
                
                document.getElementById('detail-title').textContent = diary.title;
                document.getElementById('detail-content').textContent = diary.content;
                const formattedDate = new Date(diary.created_at).toLocaleDateString();
                document.getElementById('detail-meta').innerHTML = `<span class="author">By: ${diary.username}</span><span class="date">${formattedDate}</span>`;
                
                const actionsContainer = document.getElementById('detail-actions-container');
                if (actionsContainer) {
                    const likeButtonClass = diary.user_has_liked ? 'like-button liked' : 'like-button';
                    const heartSVG = `
                        <svg class="heart-icon" viewBox="0 0 24 24" width="24" height="24" style="fill: currentColor;">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    `;
                    actionsContainer.innerHTML = `
                        <button class="${likeButtonClass}" data-diary-id="${diary.id}" data-liked="${diary.user_has_liked}">
                            ${heartSVG}
                        </button>
                        <span class="like-count">${diary.like_count}</span>
                    `;
                }

                const deleteButton = document.getElementById('delete-button');
                const editLink = document.getElementById('edit-link');
                
                if (token) {
                    const currentUser = parseJwt(token);
                    if (currentUser.username === diary.username) {
                        deleteButton.style.display = 'inline-block';
                        editLink.style.display = 'inline-block';
                        editLink.href = `edit.html?id=${diaryId}`;

                        deleteButton.addEventListener('click', async () => {
                            if (confirm('你确定要删除这篇日记吗？此操作无法撤销。')) {
                                try {
                                    const deleteResponse = await fetch(`/api/diaries/${diaryId}`, {
                                        method: 'DELETE',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if (deleteResponse.ok) {
                                        alert('删除成功！');
                                        window.location.href = 'index.html';
                                    } else {
                                        const errorResult = await deleteResponse.json();
                                        alert(`删除失败: ${errorResult.message}`);
                                    }
                                } catch (error) {
                                    console.error('删除请求失败:', error);
                                    alert('删除失败，请检查网络连接。');
                                }
                            }
                        });
                    } else {
                        deleteButton.style.display = 'none';
                        editLink.style.display = 'none';
                    }
                } else {
                    deleteButton.style.display = 'none';
                    editLink.style.display = 'none';
                }
            } catch (error) {
                console.error('加载日记详情失败:', error);
                diaryDetailContainer.innerHTML = '<h1>哦哦，没有找到这篇日记...</h1><a href="index.html" class="nav-button secondary">返回首页</a>';
            }
        }
        if (diaryId) loadDiaryDetail();
    }
    else if (editForm) {
        const params = new URLSearchParams(window.location.search);
        const diaryId = params.get('id');
        const cancelLink = document.getElementById('cancel-edit-link');
        if (cancelLink) cancelLink.href = `detail.html?id=${diaryId}`;

        async function populateEditForm() {
            try {
                const response = await fetch(`/api/diaries/${diaryId}`);
                if (!response.ok) throw new Error('无法加载日记内容');
                const diary = await response.json();
                
                const token = localStorage.getItem('jwtToken');
                if (!token || parseJwt(token).username !== diary.username) {
                    alert('无权编辑此日记！');
                    window.location.href = `detail.html?id=${diaryId}`;
                    return;
                }
                document.getElementById('diary-title').value = diary.title;
                document.getElementById('diary-content').value = diary.content;
                document.getElementById('privacy-level').value = diary.privacy_level;
            } catch (error) {
                console.error('填充编辑表单失败:', error);
                alert('加载日记内容失败，请重试。');
                window.location.href = 'index.html';
            }
        }
        if (diaryId) {
            populateEditForm();
        } else {
            alert('未指定要编辑的日记！');
            window.location.href = 'index.html';
        }

        editForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const title = document.getElementById('diary-title').value;
            const content = document.getElementById('diary-content').value;
            const privacy_level = document.getElementById('privacy-level').value;
            const token = localStorage.getItem('jwtToken');
            if (!title.trim() || !content.trim()) {
                alert('标题和内容都不能为空！');
                return;
            }
            try {
                const response = await fetch(`/api/diaries/${diaryId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, content, privacy_level })
                });
                if (response.ok) {
                    alert('日记更新成功！');
                    window.location.href = `detail.html?id=${diaryId}`;
                } else {
                    const errorResult = await response.json();
                    alert(`更新失败: ${errorResult.message}`);
                }
            } catch (error) {
                console.error('更新请求失败:', error);
                alert('更新失败，请检查网络连接。');
            }
        });
    }
    else if (diaryForm) {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            alert('请先登录才能写日记哦！');
            window.location.href = 'login.html';
            return;
        }
        diaryForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const title = document.getElementById('diary-title').value;
            const content = document.getElementById('diary-content').value;
            const privacy_level = document.getElementById('privacy-level').value;
            if (!title.trim() || !content.trim()) {
                alert('标题和内容都不能为空哦！');
                return;
            }
            try {
                const response = await fetch('/api/diaries/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, content, privacy_level }),
                });
                if (response.ok) {
                    alert('日记发布成功！');
                    window.location.href = 'index.html';
                } else {
                    const errorResult = await response.json();
                    alert(`发布失败: ${errorResult.message}`);
                }
            } catch (error) {
                console.error('发布日记请求失败:', error);
                alert('网络错误，发布失败，请稍后再试。');
            }
        });
    }
    else if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                if (response.ok) {
                    alert('注册成功！现在你可以去登录了。');
                    window.location.href = 'login.html';
                } else {
                    const errorResult = await response.json();
                    alert(`注册失败: ${errorResult.message}`);
                }
            } catch (error) {
                alert('请求发送失败，请检查网络连接。');
            }
        });
    }
    else if (loginForm) {
        const authMessage = document.getElementById('auth-message');
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (authMessage) authMessage.textContent = '';
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                const data = await response.json();
                if (response.ok) {
                    if (authMessage) {
                        authMessage.textContent = data.message;
                        authMessage.style.color = 'green';
                    }
                    localStorage.setItem('jwtToken', data.token);
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } else {
                    if (authMessage) authMessage.textContent = data.message;
                }
            } catch (error) {
                console.error('登录请求失败:', error);
                if (authMessage) authMessage.textContent = '网络错误，请稍后再试。';
            }
        });
    }

    // 全局点赞点击事件监听器
    document.body.addEventListener('click', async (event) => {
        const likeButton = event.target.closest('.like-button');
        if (!likeButton) return;

        event.preventDefault();
        
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            alert('请先登录才能点赞哦！');
            window.location.href = 'login.html';
            return;
        }

        const diaryId = likeButton.dataset.diaryId;
        const isLiked = likeButton.dataset.liked === 'true';
        const likeCountSpan = likeButton.nextElementSibling;
        const initialLikeCount = parseInt(likeCountSpan.textContent);

        // 1. 乐观更新 UI
        const newLikedState = !isLiked;
        likeButton.dataset.liked = newLikedState;
        likeButton.classList.toggle('liked');
        likeButton.innerHTML = newLikedState ? '♥' : '♡';
        likeCountSpan.textContent = newLikedState ? initialLikeCount + 1 : initialLikeCount - 1;

        try {
            const method = newLikedState ? 'POST' : 'DELETE';
            const response = await fetch(`/api/diaries/${diaryId}/like`, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('操作失败');
            }

        } catch (error) {
            console.error("点赞/取消点赞失败:", error);
            // 2. 如果请求失败，则回滚 UI
            likeButton.dataset.liked = isLiked;
            likeButton.classList.toggle('liked');
            likeButton.innerHTML = isLiked ? '♥' : '♡';
            likeCountSpan.textContent = initialLikeCount;
            alert('操作失败，请稍后重试。');
        }
    });
});