// --- 共享日记 脚本文件 v6.3: 最终修复版 ---

// =================================================================
// 辅助函数 (Helper Functions)
// =================================================================

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

    const themeToggleButton = document.getElementById('theme-toggle-button');
    const bodyElement = document.body;
    if (themeToggleButton) { 
        themeToggleButton.addEventListener('click', () => {
            bodyElement.classList.toggle('dark-theme');
        });
    }

    const diaryForm = document.querySelector('.diary-form');
    const diaryContainer = document.getElementById('diary-container');
    const diaryDetailContainer = document.getElementById('diary-detail-container');

    if (diaryForm) {
        diaryForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const title = document.getElementById('diary-title').value;
            const content = document.getElementById('diary-content').value;

            if (!title.trim() || !content.trim()) {
                alert('标题和内容都不能为空哦！');
                return;
            }

            const newDiary = {
                id: Date.now(),
                title: title,
                content: content,
                author: "我自己",
                date: new Date().toLocaleDateString()
            };

            const existingDiaries = getDiariesFromStorage() || [];
            existingDiaries.push(newDiary);
            saveDiariesToStorage(existingDiaries);

            alert('发布成功！');
            window.location.href = 'index.html';
        });
    } 
    else if (diaryContainer) {
        loadHomepage();
    }
    else if (diaryDetailContainer) {
        const params = new URLSearchParams(window.location.search);
        
        // 【关键修复】将 parseInt 换成 parseFloat，以正确处理带小数的ID
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
});