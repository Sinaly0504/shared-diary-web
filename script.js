// --- 共享日记 脚本文件 v23.0: 最终整合版 ---

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

function renderComments(comments) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    if (comments.length === 0) {
        commentsList.innerHTML = '<p>还没有评论，快来抢占第一个沙发吧！</p>';
        return;
    }
    commentsList.innerHTML = '';
    comments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.classList.add('comment');
        const formattedDate = new Date(comment.created_at).toLocaleString();
        commentElement.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">${comment.username}</span>
                <span class="comment-date">${formattedDate}</span>
            </div>
            <p class="comment-content">${comment.content}</p>
        `;
        commentsList.appendChild(commentElement);
    });
}

function renderAnnotations(annotations) {
    const diaryCard = document.getElementById('diary-detail-container');
    if (!diaryCard) return;

    // 先清除旧的批注
    document.querySelectorAll('.annotation-bubble').forEach(bubble => bubble.remove());

    if (!annotations || annotations.length === 0) return;

    const paragraphOffsets = {}; // 用于记录每个段落的批注垂直偏移量

    annotations.forEach(annotation => {
        const anchorParagraph = document.getElementById(annotation.anchor_paragraph_id);
        
        if (anchorParagraph) {
            const paragraphId = annotation.anchor_paragraph_id;
            
            // 初始化偏移量
            if (!paragraphOffsets[paragraphId]) {
                paragraphOffsets[paragraphId] = 0;
            }

            const bubble = document.createElement('div');
            bubble.className = 'annotation-bubble';
            
            bubble.innerHTML = `
                <span class="author">${annotation.username}:</span>
                ${annotation.content}
            `;

            // 【修复】将批注框添加到日记卡片内部
            diaryCard.appendChild(bubble);

            // 计算位置
            const anchorRect = anchorParagraph.getBoundingClientRect();
            const cardRect = diaryCard.getBoundingClientRect();
            
            const topPosition = anchorRect.top - cardRect.top + anchorRect.height / 2;
            const leftPosition = anchorRect.width + 20; // 在段落右侧20px处

            // 【修复】应用垂直偏移量，防止重叠
            bubble.style.top = `${topPosition + paragraphOffsets[paragraphId]}px`;
            bubble.style.left = `${leftPosition}px`;

            // 更新下一个批注的偏移量
            paragraphOffsets[paragraphId] += bubble.offsetHeight + 5; // 5px 的间距
        }
    });
}


async function loadHomepage(sortBy = 'time') {
    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch(`/api/diaries/list?sortBy=${sortBy}`, {
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

async function loadMyDiaries(sortBy = 'time') {
    const diaryContainer = document.getElementById('diary-container');
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        alert('请先登录才能查看“我的日记”！');
        window.location.href = 'login.html';
        return;
    }
    try {
        const response = await fetch(`/api/diaries/mine?sortBy=${sortBy}`, {
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

    let currentSortBy = 'time';
    let currentSearchQuery = '';

    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
        });
    }

    updateHeaderUI();

    const diaryContainer = document.getElementById('diary-container');
    const myDiariesTitle = document.querySelector('.page-title');
    const diaryDetailContainer = document.getElementById('diary-detail-container');
    const diaryForm = document.querySelector('.diary-form');
    const editForm = document.getElementById('edit-form');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const searchForm = document.getElementById('search-form');
    const sortContainer = document.querySelector('.sort-container');

    if (searchForm) {
        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const searchInput = document.getElementById('search-input');
            const query = searchInput.value.trim();
            currentSearchQuery = query;

            if (!query) {
                if (myDiariesTitle) loadMyDiaries(currentSortBy);
                else loadHomepage(currentSortBy);
                return;
            }

            const token = localStorage.getItem('jwtToken');
            let apiUrl = `/api/diaries/search?q=${encodeURIComponent(query)}&sortBy=${currentSortBy}`;
            if (myDiariesTitle) {
                apiUrl += '&scope=mine';
            }

            try {
                const response = await fetch(apiUrl, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (!response.ok) throw new Error('搜索失败');
                const diaries = await response.json();
                renderDiaries(diaries);
                if (diaries.length === 0) {
                    diaryContainer.innerHTML = `<p>没有找到与“<span class="search-term">${query}</span>”相关的日记。</p>`;
                }
            } catch (error) {
                console.error("搜索请求失败:", error);
                alert('搜索失败，请稍后再试。');
            }
        });
    }

    if (sortContainer) {
        sortContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('sort-button')) {
                const selectedSort = event.target.dataset.sort;
                if (event.target.classList.contains('active')) return;
                currentSortBy = selectedSort;
                sortContainer.querySelector('.sort-button.active').classList.remove('active');
                event.target.classList.add('active');
                if (currentSearchQuery) {
                    searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
                } else {
                    if (myDiariesTitle) {
                        loadMyDiaries(currentSortBy);
                    } else {
                        loadHomepage(currentSortBy);
                    }
                }
            }
        });
    }
    
    if (diaryContainer) {
        if (myDiariesTitle) {
            loadMyDiaries();
        } else {
            loadHomepage();
        }
    }
    else if (diaryDetailContainer) {
        // --- 【新增】显示/隐藏批注功能 ---
        const toggleCheckbox = document.getElementById('toggle-annotations-checkbox');
        if (toggleCheckbox) {
            toggleCheckbox.addEventListener('change', () => {
                const diaryCard = document.getElementById('diary-detail-container');
                if (!diaryCard) return;

                if (toggleCheckbox.checked) {
                    // 如果开关是开启的，移除隐藏类
                    diaryCard.classList.remove('annotations-hidden');
                } else {
                    // 如果开关是关闭的，添加隐藏类
                    diaryCard.classList.add('annotations-hidden');
                }
            });
        }
        const params = new URLSearchParams(window.location.search);
        const diaryId = params.get('id');
        // --- 【新增】段评功能：选中文字并显示批注按钮 ---
        const contentContainer = document.getElementById('detail-content');
        if (contentContainer) {
            contentContainer.addEventListener('mouseup', (event) => {
                setTimeout(() => {
                    const selection = window.getSelection();
                    const selectedText = selection.toString().trim();
                    const diaryId = params.get('id'); // 我们需要日记ID

                    let annotateButton = document.getElementById('annotate-button');
                    if (!annotateButton) {
                        annotateButton = document.createElement('button');
                        annotateButton.id = 'annotate-button';
                        annotateButton.className = 'nav-button';
                        annotateButton.textContent = '批注';
                        document.body.appendChild(annotateButton);
                    }

                    if (selectedText.length > 0 && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        
                        // 找到选区所在的段落元素
                        let parentElement = range.startContainer.parentElement;
                        while (parentElement && !parentElement.id.startsWith('paragraph-')) {
                            parentElement = parentElement.parentElement;
                        }

                        if (parentElement) { // 确保我们找到了一个段落
                            const paragraphId = parentElement.id;
                            const rect = range.getBoundingClientRect();
                            
                            annotateButton.style.display = 'block';
                            annotateButton.style.top = `${window.scrollY + rect.top + rect.height}px`;
                            annotateButton.style.left = `${window.scrollX + rect.right}px`;

                            // 为按钮添加一次性的点击事件
                            annotateButton.onclick = async () => {
                                const token = localStorage.getItem('jwtToken');
                                if (!token) {
                                    alert('请先登录再发表批注！');
                                    return;
                                }

                                const content = prompt('请输入你的批注：', selectedText);

                                if (content && content.trim() !== '') {
                                    try {
                                        const response = await fetch('/api/annotations/create', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify({
                                                content: content,
                                                diaryId: diaryId,
                                                anchorParagraphId: paragraphId
                                            })
                                        });

                                        if (response.ok) {
                                            alert('批注成功！');
                                        } else {
                                            const error = await response.json();
                                            alert(`批注失败: ${error.message}`);
                                        }
                                    } catch (error) {
                                        console.error('批注请求失败:', error);
                                        alert('批注失败，请检查网络连接。');
                                    }
                                }
                                // 操作完成后隐藏按钮
                                annotateButton.style.display = 'none';
                            };
                        }
                    } else {
                        annotateButton.style.display = 'none';
                    }
                }, 10); 
            });

            document.addEventListener('mousedown', (event) => {
                const annotateButton = document.getElementById('annotate-button');
                const selection = window.getSelection();
                if (annotateButton && !annotateButton.contains(event.target) && selection.toString().trim().length === 0) {
                    annotateButton.style.display = 'none';
                }
            });
        }
        async function loadDiaryDetail() {
            const token = localStorage.getItem('jwtToken');
            try {
                const response = await fetch(`/api/diaries/${diaryId}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (!response.ok) throw new Error('日记未找到');
                const diary = await response.json();
                
                document.getElementById('detail-title').textContent = diary.title;
                const formattedDate = new Date(diary.created_at).toLocaleDateString();
                document.getElementById('detail-meta').innerHTML = `<span class="author">By: ${diary.username}</span><span class="date">${formattedDate}</span>`;
                
                const contentContainer = document.getElementById('detail-content');
                contentContainer.innerHTML = '';
                const paragraphs = diary.content.split('\n');

                paragraphs.forEach((pText, index) => {
                    if (pText.trim() !== '') {
                        const pElement = document.createElement('p');
                        pElement.id = `paragraph-${index}`;
                        pElement.textContent = pText;
                        contentContainer.appendChild(pElement);
                    }
                });

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

                // 获取并渲染普通评论
                const commentsResponse = await fetch(`/api/diaries/${diaryId}/comments`);
                const comments = await commentsResponse.json();
                renderComments(comments);

                // 【新增】获取并渲染段评
                const annotationsResponse = await fetch(`/api/diaries/${diaryId}/annotations`);
                const annotations = await annotationsResponse.json();
                renderAnnotations(annotations);

            } catch (error) {
                console.error('加载日记详情失败:', error);
                diaryDetailContainer.innerHTML = '<h1>哦哦，没有找到这篇日记...</h1><a href="index.html" class="nav-button secondary">返回首页</a>';
            }
        }
        
        const token = localStorage.getItem('jwtToken');
        const commentForm = document.getElementById('comment-form');
        const commentLoginPrompt = document.getElementById('comment-login-prompt');
        if (commentForm && commentLoginPrompt) {
            if (token) {
                commentForm.style.display = 'block';
                commentLoginPrompt.style.display = 'none';
            } else {
                commentForm.style.display = 'none';
                commentLoginPrompt.style.display = 'block';
            }
        }

        if (diaryId) {
            loadDiaryDetail();
            if(commentForm) {
              commentForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const contentElement = document.getElementById('comment-content');
                const content = contentElement.value.trim();
                if (!content) {
                    alert('评论内容不能为空！');
                    return;
                }
                try {
                    const response = await fetch(`/api/diaries/${diaryId}/comments`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ content })
                    });
                    if (!response.ok) throw new Error('评论失败');
                    const result = await response.json();
                    
                    const commentsList = document.getElementById('comments-list');
                    if (commentsList.querySelector('p')) {
                        commentsList.innerHTML = '';
                    }
                    
                    const newCommentElement = document.createElement('div');
                    newCommentElement.classList.add('comment');
                    const formattedDate = new Date(result.comment.created_at).toLocaleString();
                    newCommentElement.innerHTML = `
                        <div class="comment-header">
                            <span class="comment-author">${result.comment.username}</span>
                            <span class="comment-date">${formattedDate}</span>
                        </div>
                        <p class="comment-content">${result.comment.content}</p>
                    `;
                    commentsList.appendChild(newCommentElement);
                    contentElement.value = '';
                } catch (error) {
                    console.error('评论提交失败:', error);
                    alert('评论失败，请稍后重试。');
                }
              });
            }
        }
        
        const exportButton = document.getElementById('export-button');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                const diaryCard = document.getElementById('diary-detail-container');
                const diaryTitle = document.getElementById('detail-title').textContent || 'diary';
                exportButton.textContent = '正在生成...';
                exportButton.disabled = true;
                html2canvas(diaryCard, { scale: 2, useCORS: true }).then(canvas => {
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL('image/png');
                    link.download = `${diaryTitle.trim()}.png`;
                    link.click();
                    exportButton.textContent = '导出为图片';
                    exportButton.disabled = false;
                }).catch(error => {
                    console.error('导出图片失败:', error);
                    alert('导出图片失败，请稍后重试。');
                    exportButton.textContent = '导出为图片';
                    exportButton.disabled = false;
                });
            });
        }
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

        const newLikedState = !isLiked;
        likeButton.dataset.liked = newLikedState;
        likeButton.classList.toggle('liked');
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
            likeButton.dataset.liked = isLiked;
            likeButton.classList.toggle('liked');
            likeCountSpan.textContent = initialLikeCount;
            alert('操作失败，请稍后重试。');
        }
    });
});