// --- 共享日记 脚本文件 v17.0: 实现“我的日记”功能 ---

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
        <a href="mydiaries.html" class="nav-link">我的日记</a>
        <span class="welcome-message">欢迎, ${username}</span>
        <a href="#" id="logout-link">退出</a>
      `;
      if (writeDiaryBtn) writeDiaryBtn.style.display = 'inline-block';
      const logoutLink = document.getElementById('logout-link');
      if (logoutLink) {
        logoutLink.addEventListener('click', function(event) {
          event.preventDefault();
          localStorage.removeItem('jwtToken');
          window.location.href = 'index.html';
        });
      }
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
        const formattedDate = new Date(entry.created_at).toLocaleDateString();
        card.innerHTML = `
            <a href="detail.html?id=${entry.id}" class="card-link">
                <h2 class="card-title">${entry.title}</h2>
                <p class="card-content">${entry.content.substring(0, 100)}...</p>
                <div class="card-footer">
                    <span class="author">By: ${entry.username}</span>
                    <span class="date">${formattedDate}</span>
                </div>
            </a>
        `;
        diaryContainer.appendChild(card);
    });
}

async function loadHomepage() {
    try {
        const response = await fetch('/api/diaries/list');
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
    const myDiariesTitle = document.querySelector('.page-title'); // 用来识别“我的日记”页
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
        async function loadDiaryDetail() { /* ... */ }
        if (diaryId) loadDiaryDetail();
    }
    // 如果是编辑页面 (edit.html)
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
                // 在填充表单时，也设置隐私等级的默认值
                document.getElementById('privacy-level').value = diary.privacy_level;
            } catch (error) {
                console.error('填充编辑表单失败:', error);
                alert('加载日记内容失败，请重试。');
                window.location.href = 'index.html';
            }
        }
        if (diaryId) populateEditForm();

        editForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const title = document.getElementById('diary-title').value;
            const content = document.getElementById('diary-content').value;
            const privacy_level = document.getElementById('privacy-level').value; // 【修复】读取隐私等级
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
                    body: JSON.stringify({ title, content, privacy_level }) // 【修复】发送隐私等级
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
    // 如果是“写日记”页面 (write.html)
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
            const privacy_level = document.getElementById('privacy-level').value; // 【修复】读取隐私等级
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
                    body: JSON.stringify({ title, content, privacy_level }), // 【修复】发送隐私等级
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
    // 如果是注册页面 (signup.html)
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
    // 如果是登录页面 (login.html)
    else if (loginForm) {
        const authMessage = document.getElementById('auth-message');
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (authMessage) authMessage.textContent = '';
            const username = loginForm.username.value;
            const password = loginForm.password.value;
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
});