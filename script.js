// --- 共享日记 脚本文件 v9.0: 实现前端权限控制 ---

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

// --- 更新头部UI以反映登录状态 (V2.0, 带权限控制) ---
function updateHeaderUI() {
  const authLinksContainer = document.querySelector('.user-auth-links');
  const writeDiaryBtn = document.getElementById('write-diary-btn'); // 获取写日记按钮
  const token = localStorage.getItem('jwtToken');

  if (token && authLinksContainer) {
    // --- 用户已登录 ---
    const decodedToken = parseJwt(token);
    if (decodedToken && decodedToken.username) {
      const username = decodedToken.username;
      authLinksContainer.innerHTML = `
        <span class="welcome-message">欢迎, ${username}</span>
        <a href="#" id="logout-link">退出</a>
      `;

      // 显示“写日记”按钮
      if (writeDiaryBtn) {
        writeDiaryBtn.style.display = 'inline-block';
      }

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
    // --- 用户未登录 ---
    authLinksContainer.innerHTML = `
      <a href="signup.html">注册</a>
      <a href="login.html">登录</a>
    `;

    // 隐藏“写日记”按钮
    if (writeDiaryBtn) {
      writeDiaryBtn.style.display = 'none';
    }
  }
}

// --- 单机版日记数据读写函数 (未来会被后端API替代) ---
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

    // 立即更新头部UI，判断登录状态并控制按钮显示
    updateHeaderUI();

    // --- 根据页面不同元素，执行不同逻辑 ---
    const diaryForm = document.querySelector('.diary-form');
    const diaryContainer = document.getElementById('diary-container');
    const diaryDetailContainer = document.getElementById('diary-detail-container');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');

    
    // 1. 如果是“写日记”页面 (write.html)
    if (diaryForm) {
        // --- 页面守卫：检查是否登录 ---
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            alert('请先登录才能写日记哦！');
            window.location.href = 'login.html';
            return;
        }

        // --- 提交表单逻辑 (V2.0 - 连接后端) ---
        diaryForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const title = document.getElementById('diary-title').value;
            const content = document.getElementById('diary-content').value;

            if (!title.trim() || !content.trim()) {
                alert('标题和内容都不能为空哦！');
                return;
            }

            try {
                const response = await fetch('/api/diaries/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // 关键：在请求头中附上我们的 token
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, content }),
                });

                if (response.ok) {
                    // 如果后端返回成功
                    alert('日记发布成功！');
                    window.location.href = 'index.html'; // 跳转回主页
                } else {
                    // 如果后端返回失败
                    const errorResult = await response.json();
                    alert(`发布失败: ${errorResult.message}`);
                }
            } catch (error) {
                console.error('发布日记请求失败:', error);
                alert('网络错误，发布失败，请稍后再试。');
            }
        });
    }
    // 2. 如果是主页 (index.html)
    else if (diaryContainer) {
        loadHomepage();
    }
    // 3. 如果是详情页 (detail.html)
    else if (diaryDetailContainer) {
        const params = new URLSearchParams(window.location.search);
        const diaryId = parseFloat(params.get('id'));
        const diaries = getDiariesFromStorage();
        const diary = diaries.find(d => d.id === diaryId);
        if (diary) {
            document.getElementById('detail-title').textContent = diary.title;
            document.getElementById('detail-content').textContent = diary.content;
            document.getElementById('detail-meta').innerHTML = `
                <span class="author">By: ${diary.author}</span>
                <span class="date">${diary.date}</span>
            `;
            document.getElementById('delete-button').addEventListener('click', () => {
                if (confirm('你确定要删除这篇日记吗？此操作无法撤销。')) {
                    const updatedDiaries = diaries.filter(d => d.id !== diaryId);
                    saveDiariesToStorage(updatedDiaries);
                    alert('删除成功！');
                    window.location.href = 'index.html';
                }
            });
        } else {
            diaryDetailContainer.innerHTML = '<h1>哦哦，没有找到这篇日记...</h1><a href="index.html" class="nav-button secondary">返回首页</a>';
        }
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
    // 5. 如果是登录页面 (login.html)
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