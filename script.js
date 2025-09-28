// --- 共享日记 脚本文件 v8.0: 实现登录状态管理 ---

// =================================================================
// 辅助函数 (Helper Functions)
// =================================================================

// --- JWT 解码工具函数 ---
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

// --- 更新头部UI以反映登录状态 ---
function updateHeaderUI() {
  const authLinksContainer = document.querySelector('.user-auth-links');
  const token = localStorage.getItem('jwtToken');

  if (token && authLinksContainer) {
    const decodedToken = parseJwt(token);
    if (decodedToken && decodedToken.username) {
      const username = decodedToken.username;
      authLinksContainer.innerHTML = `
        <span class="welcome-message">欢迎, ${username}</span>
        <a href="#" id="logout-link">退出</a>
      `;

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
  }
}

function getDiariesFromStorage() {
    const diariesJSON = localStorage.getItem('diaries');
    return diariesJSON ? JSON.parse(diariesJSON) : null;
}

function saveDiariesToStorage(diaries) {
    localStorage.setItem('diaries', JSON.stringify(diaries));
}

function renderDiaries(diaries) {
    const diaryContainer = document.getElementById('diary-container');
    if (!diaryContainer) return;
    diaryContainer.innerHTML = '';
    diaries.slice().reverse().forEach(entry => {
        const card = document.createElement('div');
        card.classList.add('diary-card');
        card.innerHTML = `
            <a href="detail.html?id=${entry.id}" class="card-link">
                <h2 class="card-title">${entry.title}</h2>
                <p class="card-content">${entry.content}</p>
                <div class="card-footer">
                    <span class="author">By: ${entry.author}</span>
                    <span class="date">${entry.date}</span>
                </div>
            </a>
        `;
        diaryContainer.appendChild(card);
    });
}

async function loadHomepage() {
    let diaries = getDiariesFromStorage();
    if (!diaries) {
        try {
            const response = await fetch('data.json');
            const initialDiaries = await response.json();
            diaries = initialDiaries.map(diary => ({
                ...diary,
                id: Date.now() + Math.random()
            }));
            saveDiariesToStorage(diaries);
        } catch (error) {
            console.error("加载初始数据失败:", error);
            diaries = [];
        }
    }
    renderDiaries(diaries);
}

// =================================================================
// 页面判断与事件监听 (整个应用的“大脑”)
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    // 立即更新头部UI，判断登录状态
    updateHeaderUI();

    // --- 主题切换功能 (所有页面通用) ---
    // 注意：你的 HTML 中没有 theme-toggle-button，这个功能可能之前被移除了
    // 如果需要，请确保 HTML 中有 <button id="theme-toggle-button">切换主题</button>
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const bodyElement = document.body;
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            bodyElement.classList.toggle('dark-theme');
        });
    }

    // --- 根据页面不同元素，执行不同逻辑 ---
    const diaryForm = document.querySelector('.diary-form');
    const diaryContainer = document.getElementById('diary-container');
    const diaryDetailContainer = document.getElementById('diary-detail-container');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form'); // 将登录表单也移到这里

    // 1. 如果是“写日记”页面 (write.html)
    if (diaryForm) {
        // ... (这部分代码保持不变)
    }
    // 2. 如果是主页 (index.html)
    else if (diaryContainer) {
        loadHomepage();
    }
    // 3. 如果是详情页 (detail.html)
    else if (diaryDetailContainer) {
        // ... (这部分代码保持不变)
    }
    // 4. 如果是注册页面 (signup.html)
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
                    window.location.href = 'login.html'; // 跳转到登录页更友好
                } else {
                    const errorResult = await response.json();
                    alert(`注册失败: ${errorResult.message}`);
                }
            } catch (error) {
                alert('请求发送失败，请检查网络连接。');
            }
        });
    }
    // 5. 【关键改动】如果是登录页面 (login.html)
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