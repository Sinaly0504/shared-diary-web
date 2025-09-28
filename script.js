// --- 共享日记 脚本文件 v10.0: 连接数据库获取日记列表 ---

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
  const writeDiaryBtn = document.getElementById('write-diary-btn');
  const token = localStorage.getItem('jwtToken');

  if (token && authLinksContainer) {
    const decodedToken = parseJwt(token);
    if (decodedToken && decodedToken.username) {
      const username = decodedToken.username;
      authLinksContainer.innerHTML = `
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

// --- 【关键修改 V2.0】渲染从后端获取的日记 ---
function renderDiaries(diaries) {
    const diaryContainer = document.getElementById('diary-container');
    if (!diaryContainer) return;
    diaryContainer.innerHTML = '';
    
    // 我们不再需要 .slice().reverse()，因为后端已经排好序了
    diaries.forEach(entry => {
        const card = document.createElement('div');
        card.classList.add('diary-card');
        
        // 使用新的字段名: username 和 created_at
        // 同时，格式化日期，让它更好看
        const formattedDate = new Date(entry.created_at).toLocaleDateString();

        card.innerHTML = `
            <a href="detail.html?id=${entry.id}" class="card-link">
                <h2 class="card-title">${entry.title}</h2>
                <p class="card-content">${entry.content}</p>
                <div class="card-footer">
                    <span class="author">By: ${entry.username}</span>
                    <span class="date">${formattedDate}</span>
                </div>
            </a>
        `;
        diaryContainer.appendChild(card);
    });
}

// --- 【关键修改 V2.0】从后端 API 加载主页数据 ---
async function loadHomepage() {
    try {
        const response = await fetch('/api/diaries/list');
        if (!response.ok) {
            throw new Error('获取日记失败');
        }
        const diaries = await response.json();
        renderDiaries(diaries);
    } catch (error) {
        console.error("加载主页数据失败:", error);
        const diaryContainer = document.getElementById('diary-container');
        if (diaryContainer) {
            diaryContainer.innerHTML = '<p>加载日记失败，请稍后刷新重试。</p>';
        }
    }
}


// =================================================================
// 页面判断与事件监听 (整个应用的“大脑”)
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    updateHeaderUI();

    const diaryForm = document.querySelector('.diary-form');
    const diaryContainer = document.getElementById('diary-container');
    const diaryDetailContainer = document.getElementById('diary-detail-container');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    // --- 【修复】主题切换功能 (所有页面通用) ---
    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
        });
    }

    // 如果是主页 (index.html)
    if (diaryContainer) {
        loadHomepage();
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
                    body: JSON.stringify({ title, content }),
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
    // 【关键修改 V2.0】如果是详情页 (detail.html)
    else if (diaryDetailContainer) {
        const params = new URLSearchParams(window.location.search);
        const diaryId = params.get('id');

        async function loadDiaryDetail() {
            try {
                const response = await fetch(`/api/diaries/${diaryId}`);
                if (!response.ok) {
                    throw new Error('日记未找到');
                }
                const diary = await response.json();
                
                // 填充页面内容
                document.getElementById('detail-title').textContent = diary.title;
                document.getElementById('detail-content').textContent = diary.content;
                const formattedDate = new Date(diary.created_at).toLocaleDateString();
                document.getElementById('detail-meta').innerHTML = `
                    <span class="author">By: ${diary.username}</span>
                    <span class="date">${formattedDate}</span>
                `;
                
                // 【权限控制】只有作者本人才能看到删除按钮
                const token = localStorage.getItem('jwtToken');
                const deleteButton = document.getElementById('delete-button');
                if (token) {
                    const currentUser = parseJwt(token);
                    if (currentUser.username === diary.username) {
                        deleteButton.style.display = 'inline-block';
                        // 我们将在下一步实现删除功能
                        // deleteButton.addEventListener('click', handleDelete); 
                    } else {
                        deleteButton.style.display = 'none';
                    }
                } else {
                    deleteButton.style.display = 'none';
                }

            } catch (error) {
                console.error('加载日记详情失败:', error);
                diaryDetailContainer.innerHTML = '<h1>哦哦，没有找到这篇日记...</h1><a href="index.html" class="nav-button secondary">返回首页</a>';
            }
        }

        if (diaryId) {
            loadDiaryDetail();
        }
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