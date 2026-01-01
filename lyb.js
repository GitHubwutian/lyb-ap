// 切换管理面板显示
function toggleManagementPanel() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        alert('只有管理员才能使用管理功能！');
        return;
    }
    
    const panel = document.getElementById('managementPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}
function importData() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        alert('只有管理员才能导入数据！');
        return;
    }
    
    // 检查XLSX库是否可用
    if (typeof XLSX === 'undefined') {
        alert('Excel导入功能需要加载XLSX库，请检查网络连接或稍后重试');
        return;
    }
    
    // 创建文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls,.csv';
    fileInput.style.display = 'none';
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // 获取第一个工作表
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // 将工作表转换为JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length <= 1) {
                    alert('Excel文件中没有有效的数据！');
                    return;
                }
                
                // 解析数据并导入到留言板
                const messages = [];
                const headers = jsonData[0]; // 第一行是表头
                
                // 根据表头确定列索引
                const levelIndex = headers.indexOf('层级');
                const typeIndex = headers.indexOf('类型');
                const authorIndex = headers.indexOf('姓名');
                const contentIndex = headers.indexOf('内容');
                const timeIndex = headers.indexOf('时间');
                const replyToIndex = headers.indexOf('回复对象');
                const pinnedIndex = headers.indexOf('置顶状态');
                const pinnedTimeIndex = headers.indexOf('置顶时间');
                
                // 构建留言树结构
                const messageMap = new Map();
                const rootMessages = [];
                
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (row.length < 5) continue; // 至少需要层级、类型、姓名、内容、时间
                    
                    const level = parseInt(row[levelIndex]) || 0;
                    const type = row[typeIndex] || '留言';
                    const author = row[authorIndex] || '匿名';
                    const content = row[contentIndex] || '';
                    const time = row[timeIndex] || new Date().toLocaleString();
                    const replyTo = row[replyToIndex] || '';
                    const pinned = row[pinnedIndex] === '是';
                    const pinnedTime = row[pinnedTimeIndex] || '';
                    
                    const messageItem = {
                        id: Date.now() + i,
                        author: author,
                        content: content,
                        time: time,
                        pinned: pinned,
                        pinnedTime: pinnedTime,
                        replies: []
                    };
                    
                    if (level === 0) {
                        // 主留言
                        rootMessages.push(messageItem);
                        messageMap.set(i, messageItem);
                    } else {
                        // 回复，需要找到父级
                        let parentFound = false;
                        
                        // 从当前行向上查找父级
                        for (let j = i - 1; j >= 1; j--) {
                            const parentRow = jsonData[j];
                            if (parentRow.length < 5) continue;
                            
                            const parentLevel = parseInt(parentRow[levelIndex]) || 0;
                            const parentAuthor = parentRow[authorIndex] || '';
                            
                            if (parentLevel === level - 1 && parentAuthor === replyTo) {
                                const parentItem = messageMap.get(j);
                                if (parentItem) {
                                    parentItem.replies.push(messageItem);
                                    messageMap.set(i, messageItem);
                                    parentFound = true;
                                    break;
                                }
                            }
                        }
                        
                        if (!parentFound) {
                            // 如果找不到父级，作为主留言处理
                            rootMessages.push(messageItem);
                            messageMap.set(i, messageItem);
                        }
                    }
                }
                
                if (rootMessages.length === 0) {
                    alert('没有找到有效的留言数据！请确保Excel文件格式正确。');
                    return;
                }
                
                // 创建美化的选择面板
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                `;
                
                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    text-align: center;
                    min-width: 400px;
                    max-width: 500px;
                `;
                
                const title = document.createElement('h3');
                title.textContent = '选择导入方式';
                title.style.cssText = `
                    margin: 0 0 20px 0;
                    color: #333;
                    font-size: 18px;
                `;
                
                const description = document.createElement('p');
                description.textContent = `请选择导入 ${rootMessages.length} 条留言数据的方式：`;
                description.style.cssText = `
                    margin: 0 0 25px 0;
                    color: #666;
                    font-size: 14px;
                    line-height: 1.5;
                `;
                
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = `
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-bottom: 20px;
                `;
                
                // 覆盖留言按钮
                const overwriteBtn = document.createElement('button');
                overwriteBtn.textContent = '覆盖留言';
                overwriteBtn.style.cssText = `
                    padding: 12px 24px;
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    transition: all 0.3s;
                    min-width: 120px;
                `;
                overwriteBtn.onmouseover = () => overwriteBtn.style.background = '#ff5252';
                overwriteBtn.onmouseout = () => overwriteBtn.style.background = '#ff6b6b';
                
                // 插入留言按钮
                const insertBtn = document.createElement('button');
                insertBtn.textContent = '插入留言';
                insertBtn.style.cssText = `
                    padding: 12px 24px;
                    background: #4ecdc4;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    transition: all 0.3s;
                    min-width: 120px;
                `;
                insertBtn.onmouseover = () => insertBtn.style.background = '#26a69a';
                insertBtn.onmouseout = () => insertBtn.style.background = '#4ecdc4';
                
                // 取消按钮
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = '取消';
                cancelBtn.style.cssText = `
                    padding: 8px 16px;
                    background: #95a5a6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.3s;
                `;
                cancelBtn.onmouseover = () => cancelBtn.style.background = '#7f8c8d';
                cancelBtn.onmouseout = () => cancelBtn.style.background = '#95a5a6';
                
                // 按钮点击事件
                overwriteBtn.onclick = function() {
                    document.body.removeChild(modal);
                    if (confirm(`是否导入${rootMessages.length}条留言数据？这将覆盖当前所有留言。`)) {
                        localStorage.setItem('messages', JSON.stringify(rootMessages));
                        loadMessages();
                        alert(`成功导入${rootMessages.length}条留言数据！`);
                    }
                };
                
                insertBtn.onclick = function() {
                    document.body.removeChild(modal);
                    const existingMessages = JSON.parse(localStorage.getItem('messages') || '[]');
                    const mergedMessages = [...existingMessages, ...rootMessages];
                    
                    mergedMessages.sort((a, b) => {
                        const timeA = new Date(a.time).getTime();
                        const timeB = new Date(b.time).getTime();
                        return timeB - timeA;
                    });
                    
                    if (confirm(`是否导入${rootMessages.length}条留言数据？这将保留当前${existingMessages.length}条留言，并按时间顺序合并新数据。`)) {
                        localStorage.setItem('messages', JSON.stringify(mergedMessages));
                        loadMessages();
                        alert(`成功导入${rootMessages.length}条留言数据！合并后共有${mergedMessages.length}条留言。`);
                    }
                };
                
                cancelBtn.onclick = function() {
                    document.body.removeChild(modal);
                };
                
                // 组装模态框
                buttonContainer.appendChild(overwriteBtn);
                buttonContainer.appendChild(insertBtn);
                modalContent.appendChild(title);
                modalContent.appendChild(description);
                modalContent.appendChild(buttonContainer);
                modalContent.appendChild(cancelBtn);
                modal.appendChild(modalContent);
                document.body.appendChild(modal);
                
            } catch (error) {
                console.error('导入Excel文件时出错:', error);
                alert('导入Excel文件失败，请检查文件格式是否正确！错误信息：' + error.message);
            }
        };
        
        reader.onerror = function() {
            alert('读取文件失败，请重试！');
        };
        
        reader.readAsArrayBuffer(file);
    };
    
    // 触发文件选择
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

// 导出数据函数 - 重新设计版，支持嵌套回复
function exportData() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        alert('只有管理员才能导出数据！');
        return;
    }
    
    // 检查XLSX库是否可用
    if (typeof XLSX === 'undefined') {
        alert('Excel导出功能需要加载XLSX库，请检查网络连接或稍后重试');
        return;
    }
    
    // 从localStorage加载留言数据
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    
    if (messages.length === 0) {
        alert('没有留言数据可以导出！');
        return;
    }
    
    try {
        // 准备Excel数据
        const excelData = [];
        
        // 添加表头 - 重新设计表头结构
        excelData.push([
            '层级', '类型', '姓名', '内容', '时间', 
            '回复对象', '置顶状态', '置顶时间'
        ]);
        
        // 递归函数：处理留言和所有层级的回复
        function processMessages(messages, level = 0, parentAuthor = '') {
            messages.forEach((item, index) => {
                const isMessage = level === 0; // 第一层是主留言
                const type = isMessage ? '留言' : `回复${level}`;
                
                // 主留言数据
                excelData.push([
                    level, // 层级
                    type,  // 类型
                    item.author || '匿名',
                    item.content || '',
                    item.time || new Date().toLocaleString(),
                    parentAuthor, // 回复对象
                    isMessage && item.pinned ? '是' : '否', // 置顶状态
                    isMessage && item.pinnedTime ? item.pinnedTime : '' // 置顶时间
                ]);
                
                // 处理回复数据（包括嵌套回复）
                if (item.replies && item.replies.length > 0) {
                    processMessages(item.replies, level + 1, item.author);
                }
            });
        }
        
        // 处理所有留言数据
        processMessages(messages);
        
        // 创建工作簿和工作表
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        
        // 设置列宽
        const colWidths = [
            { wch: 8 },  // 层级列
            { wch: 10 }, // 类型列
            { wch: 15 }, // 姓名列
            { wch: 60 }, // 内容列
            { wch: 20 }, // 时间列
            { wch: 15 }, // 回复对象列
            { wch: 10 }, // 置顶状态列
            { wch: 20 }  // 置顶时间列
        ];
        worksheet['!cols'] = colWidths;
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(workbook, worksheet, '留言数据');
        
        // 生成Excel文件并下载
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `滑县二中留言板数据_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        
        // 清理URL对象
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        // 统计总数据量
        const totalItems = excelData.length - 1; // 减去表头
        // alert(`成功导出${totalItems}条数据（包含${messages.length}条留言和所有回复）！`);
        
    } catch (error) {
        console.error('导出Excel文件时出错:', error);
        alert('导出Excel文件失败，请重试！');
    }
}
// 清除全部留言
function clearAllMessages() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        alert('只有管理员才能清除全部留言！');
        return;
    }
    
    const confirmation = confirm('确定要清除所有留言吗？此操作不可撤销！');
    if (!confirmation) {
        return;
    }
    
    try {
        // 清除本地存储中的留言数据
        localStorage.removeItem('messages');
        
        // 重新加载留言列表（显示空列表）
        loadMessages();
        
        // 关闭管理面板
        const panel = document.getElementById('managementPanel');
        panel.style.display = 'none';
        
        // alert('所有留言已成功清除！');
    } catch (error) {
        console.error('清除留言时出错:', error);
        alert('清除留言时出错：' + error.message);
    }
}


// =============================================
// 本地留言板系统 - 完整重构版
// =============================================

// 管理账号配置常量
const CONFIG = {
    // 移除服务器相关配置，仅使用本地存储
    ADMIN_ACCOUNTS: {
        'admin': 'admin123',
        '管理员': '123456',
        '二中': '666'
    }
};

// =============================================
// 工具函数
// =============================================

// 转义HTML特殊字符
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// =============================================
// 窗口置顶功能
// =============================================

let isWindowPinned = false;

// 切换窗口置顶状态
function toggleWindowPin() {
    try {
        // 检查是否在NW.js环境中
        if (typeof nw !== 'undefined' && nw.Window) {
            const win = nw.Window.get();
            
            if (isWindowPinned) {
                win.setAlwaysOnTop(false);
                isWindowPinned = false;
                
                // 更新按钮状态
                const pinBtn = document.getElementById('pin-window-btn');
                if (pinBtn) {
                    pinBtn.classList.remove('pinned');
                    pinBtn.title = '窗口置顶';
                }
            } else {
                win.setAlwaysOnTop(true);
                isWindowPinned = true;
                
                // 更新按钮状态
                const pinBtn = document.getElementById('pin-window-btn');
                if (pinBtn) {
                    pinBtn.classList.add('pinned');
                    pinBtn.title = '取消置顶';
                }
            }
        } else {
            // 如果不在NW.js环境中，提供一个简单的提示
            if (isWindowPinned) {
                isWindowPinned = false;
                const pinBtn = document.getElementById('pin-window-btn');
                if (pinBtn) {
                    pinBtn.classList.remove('pinned');
                    pinBtn.title = '窗口置顶';
                }
                alert('窗口置顶已关闭（仅在NW.js应用中生效）');
            } else {
                isWindowPinned = true;
                const pinBtn = document.getElementById('pin-window-btn');
                if (pinBtn) {
                    pinBtn.classList.add('pinned');
                    pinBtn.title = '取消置顶';
                }
                alert('窗口置顶已开启（仅在NW.js应用中生效）');
            }
        }
    } catch (error) {
        console.error('设置窗口置顶时出错:', error);
        alert('设置窗口置顶时出错，请确保在NW.js环境中运行');
    }
}
// =============================================
// 用户认证管理
// =============================================

// 检查登录状态
function checkLoginStatus() {
    const currentUser = localStorage.getItem('currentUser');
    const loginForm = document.getElementById('loginForm');
    const userInfo = document.getElementById('userInfo');
    const currentUserSpan = document.getElementById('currentUser');
    
    if (currentUser) {
        loginForm.style.display = 'none';
        userInfo.style.display = 'flex';
        currentUserSpan.textContent = currentUser;
    } else {
        loginForm.style.display = 'flex';
        userInfo.style.display = 'none';
    }
}

// 登录函数
function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!username || !password) {
        alert('只有管理员才能登录，其他人可以直接留言');
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        return;
    }
    
    if (CONFIG.ADMIN_ACCOUNTS[username] && CONFIG.ADMIN_ACCOUNTS[username] === password) {
        // 登录成功
        localStorage.setItem('currentUser', username);
        checkLoginStatus();
        alert('登录成功');
        loadMessages();
    } else {
        alert('管理员用户名或密码错误');
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('currentUser');
    checkLoginStatus();
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
     // 隐藏管理面板
    const panel = document.getElementById('managementPanel');
    if (panel) {
        panel.style.display = 'none';
    }
    
    alert('已退出管理员登录！');
    
    // 退出登录后聚焦到留言表单的姓名输入框
    setTimeout(() => {
        const authorInput = document.getElementById('author');
        if (authorInput) {
            authorInput.focus();
        }
    }, 100);
}

// 处理用户名输入框回车键事件
function handleUsernameKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById('loginPassword').focus();
    }
}

// 处理登录表单回车键事件
function handleLoginKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        login();
    }
}

// =============================================
// 留言数据管理
// =============================================

// 从本地存储加载留言
function loadMessages() {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) {
        console.error('留言列表容器未找到');
        return;
    }
    
    // 显示加载中
    messagesList.innerHTML = '<div class="no-messages">正在加载留言...</div>';
    
    // 从localStorage加载留言数据
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    displayMessages(messages, messagesList);
}

// 显示留言列表
function displayMessages(messages, messagesList) {
    if (messages.length === 0) {
        messagesList.innerHTML = '<div class="no-messages">暂无留言，快来发表第一条留言吧！</div>';
        return;
    }
    
    messagesList.innerHTML = '';
    
    // 排序：置顶的在前，然后按时间倒序
    const sortedMessages = messages.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.id - a.id;
    });
    
    sortedMessages.forEach(message => {
        const messageElement = createMessageElement(message);
        messagesList.appendChild(messageElement);
    });
}

// 创建留言元素
function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = 'message';
    if (message.pinned) {
        div.classList.add('pinned');
    }
    
    const hasReplies = message.replies && message.replies.length > 0;
    const currentUser = localStorage.getItem('currentUser');
    
    div.innerHTML = `
        <div class="message-header">
            <div class="message-author-info">
                ${message.pinned ? '<span class="pinned-badge">置顶</span>' : ''}
                <button class="reply-btn" onclick="toggleReplyForm(${message.id}, 'message', '${escapeHtml(message.author)}')">回复</button>
                <span class="message-author">${escapeHtml(message.author)}</span>
                ${hasReplies ? `<button class="toggle-btn" onclick="toggleReplies(${message.id})">收起回复 (${message.replies.length})</button>` : ''}
            </div>
            <div class="btn-group">
                <span class="message-time">${message.time}${message.pinnedTime ? ` (置顶于: ${message.pinnedTime})` : ''}</span>
                ${currentUser ? `
                    <button class="pin-btn" onclick="${message.pinned ? 'unpinMessage' : 'pinMessage'}(${message.id})">
                        ${message.pinned ? '取消置顶' : '置顶'}
                    </button>
                    <button class="delete-btn" onclick="deleteMessage(${message.id})">删除</button>
                ` : ''}
            </div>
        </div>
        <div class="message-content">${escapeHtml(message.content)}</div>
        <div class="reply-form" id="reply-form-${message.id}">
            <div class="form-group">
                <label for="reply-author-${message.id}">回复人：</label>
                <input type="text" id="reply-author-${message.id}" required placeholder="请输入您的姓名">
            </div>
            <div class="form-group">
                <label for="reply-content-${message.id}">回复内容：</label>
                <textarea id="reply-content-${message.id}" required placeholder="请输入回复内容"></textarea>
            </div>
            <div class="reply-target-info">回复对象：${escapeHtml(message.author)}</div>
            <button onclick="submitReply(${message.id}, null, '${escapeHtml(message.author)}')">提交回复</button>
        </div>
    `;
    
    // 添加回复列表
    if (hasReplies) {
        const repliesDiv = document.createElement('div');
        repliesDiv.className = 'replies';
        repliesDiv.id = `replies-${message.id}`;
        
        message.replies.sort((a, b) => b.id - a.id).forEach(reply => {
            const replyElement = createReplyElement(reply, message.id, null, message.author);
            repliesDiv.appendChild(replyElement);
        });
        
        div.appendChild(repliesDiv);
    }
    
    return div;
}

// 创建回复元素
function createReplyElement(reply, messageId, parentReplyId, parentAuthor) {
    const div = document.createElement('div');
    div.className = 'reply';
    
    // 统一ID格式：使用reply.id作为唯一标识
    const replyIdStr = `${reply.id}`;
    div.id = `reply-${replyIdStr}`;
    
    const replyToHtml = parentAuthor ? `<span class="reply-to">回复 ${escapeHtml(parentAuthor)}</span>` : `<span class="reply-to">回复 ${escapeHtml(reply.parentAuthor || '留言')}</span>`;
    
    const hasNestedReplies = reply.replies && reply.replies.length > 0;
    const currentUser = localStorage.getItem('currentUser');
    
    div.innerHTML = `
        <div class="reply-header">
            <div class="reply-author-info">
                <button class="reply-btn" onclick="toggleReplyForm('${replyIdStr}', 'reply', ${messageId}, ${reply.id}, '${escapeHtml(reply.author)}')">回复</button>
                <span class="reply-author">${escapeHtml(reply.author)}</span>
                ${replyToHtml}
                ${hasNestedReplies ? `<button class="toggle-btn" onclick="toggleNestedReplies('${replyIdStr}')">展开回复 (${reply.replies.length})</button>` : ''}
            </div>
            <div class="btn-group">
                <span class="reply-time">${reply.time}</span>
                ${currentUser ? `<button class="delete-btn" onclick="deleteReply(${messageId}, ${reply.id}, ${parentReplyId || 'null'})">删除</button>` : ''}
            </div>
        </div>
        <div class="reply-content">${escapeHtml(reply.content)}</div>
        <div class="reply-form" id="reply-form-${replyIdStr}">
            <div class="form-group">
                <label for="reply-author-${replyIdStr}">回复人：</label>
                <input type="text" id="reply-author-${replyIdStr}" required placeholder="请输入您的姓名">
            </div>
            <div class="form-group">
                <label for="reply-content-${replyIdStr}">回复内容：</label>
                <textarea id="reply-content-${replyIdStr}" required placeholder="请输入回复内容"></textarea>
            </div>
            <div class="reply-target-info">回复对象：${escapeHtml(reply.author)}</div>
            <button onclick="submitReplyToReply(${messageId}, ${reply.id}, '${replyIdStr}', '${escapeHtml(reply.author)}')">提交回复</button>
        </div>
    `;
    
    // 添加嵌套回复列表 - 确保嵌套回复默认显示
    if (hasNestedReplies) {
        const nestedRepliesDiv = document.createElement('div');
        nestedRepliesDiv.className = 'nested-replies';
        nestedRepliesDiv.id = `nested-replies-${replyIdStr}`;
        
        // 确保嵌套回复按时间倒序排列
        reply.replies.sort((a, b) => b.id - a.id).forEach(nestedReply => {
            const nestedReplyElement = createReplyElement(nestedReply, messageId, reply.id, reply.author);
            nestedRepliesDiv.appendChild(nestedReplyElement);
        });
        
        div.appendChild(nestedRepliesDiv);
    }
    
    return div;
}

// =============================================
// 留言管理功能
// =============================================

// 保存留言到本地存储
function saveMessage(message) {
    // 保存到localStorage
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    messages.push(message);
    localStorage.setItem('messages', JSON.stringify(messages));
    
    // 立即重新加载留言列表以确保显示最新数据
    setTimeout(() => {
        loadMessages();
    }, 100);
}

// 保存回复
function saveReply(messageId, reply) {
    // 保存到localStorage
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
        if (!messages[messageIndex].replies) {
            messages[messageIndex].replies = [];
        }
        messages[messageIndex].replies.push(reply);
        localStorage.setItem('messages', JSON.stringify(messages));
    }
}

// 保存嵌套回复
function saveReplyToReply(messageId, replyId, nestedReply) {
    // 保存到localStorage
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
        function findReplyAndAddNested(replies) {
            for (let i = 0; i < replies.length; i++) {
                if (replies[i].id === replyId) {
                    if (!replies[i].replies) {
                        replies[i].replies = [];
                    }
                    // 确保嵌套回复按时间倒序排列
                    replies[i].replies.unshift(nestedReply);
                    return true;
                }
                if (replies[i].replies && replies[i].replies.length > 0) {
                    if (findReplyAndAddNested(replies[i].replies)) {
                        return true;
                    }
                }
            }
            return false;
        }
        
        const success = findReplyAndAddNested(messages[messageIndex].replies);
        if (success) {
            localStorage.setItem('messages', JSON.stringify(messages));
            
            // 立即重新加载留言列表以确保显示最新数据
            setTimeout(() => {
                loadMessages();
            }, 100); // 添加短暂延迟确保DOM更新
        } else {
            console.error('无法找到对应的回复来添加嵌套回复');
            // 如果找不到回复，仍然重新加载数据
            setTimeout(() => {
                loadMessages();
            }, 100);
        }
    } else {
        console.error('无法找到对应的留言');
        setTimeout(() => {
            loadMessages();
        }, 100);
    }
}

// 删除留言
function deleteMessage(messageId) {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
        alert('只有管理员才能删除留言！');
        return;
    }
    
    if (confirm('确定要删除这条留言吗？')) {
        // 从localStorage删除
        let messages = JSON.parse(localStorage.getItem('messages') || '[]');
        messages = messages.filter(message => message.id !== messageId);
        localStorage.setItem('messages', JSON.stringify(messages));
        
        loadMessages();
    }
}

// 删除回复
function deleteReply(messageId, replyId, parentReplyId = null) {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
        alert('只有管理员才能删除回复！');
        return;
    }
    
    if (confirm('确定要删除这条回复吗？')) {
        const messages = JSON.parse(localStorage.getItem('messages') || '[]');
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
            function findAndDeleteReply(replies) {
                for (let i = 0; i < replies.length; i++) {
                    if (replies[i].id === replyId) {
                        replies.splice(i, 1);
                        return true;
                    }
                    if (replies[i].replies && replies[i].replies.length > 0) {
                        if (findAndDeleteReply(replies[i].replies)) {
                            return true;
                        }
                    }
                }
                return false;
            }
            
            const deleteResult = findAndDeleteReply(messages[messageIndex].replies);
            
            if (deleteResult) {
                localStorage.setItem('messages', JSON.stringify(messages));
                
                loadMessages();
            } else {
                alert('删除失败：未找到对应的回复！');
            }
        } else {
            alert('删除失败：未找到对应的留言！');
        }
    }
}

// =============================================
// 置顶功能
// =============================================

// 置顶留言
function pinMessage(messageId) {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
        alert('只有管理员才能置顶留言！');
        return;
    }
    
    // 更新localStorage
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
        messages[messageIndex].pinned = true;
        messages[messageIndex].pinnedTime = new Date().toLocaleString();
        localStorage.setItem('messages', JSON.stringify(messages));
        
        loadMessages();
    }
}
// 取消置顶
function unpinMessage(messageId) {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
        alert('只有管理员才能取消置顶留言！');
        return;
    }
    
    // 更新localStorage
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
        messages[messageIndex].pinned = false;
        messages[messageIndex].pinnedTime = null;
        localStorage.setItem('messages', JSON.stringify(messages));
        
        loadMessages();
    }
}

// =============================================
// 界面交互功能
// =============================================

// 切换回复表单显示
function toggleReplyForm(id, type, messageId = null, replyId = null, replyAuthor = null) {
    const replyForm = document.getElementById(`reply-form-${id}`);
    
    if (replyForm.classList.contains('active')) {
        replyForm.classList.remove('active');
    } else {
        const allReplyForms = document.querySelectorAll('.reply-form');
        allReplyForms.forEach(form => {
            form.classList.remove('active');
        });
        
        replyForm.classList.add('active');
        
        // 确保表单输入框可以获取焦点
        setTimeout(() => {
            const authorInput = replyForm.querySelector('input[type="text"]');
            const contentInput = replyForm.querySelector('textarea');
            if (authorInput) {
                authorInput.tabIndex = 0;
                authorInput.focus();
            }
            if (contentInput) {
                contentInput.tabIndex = 0;
            }
        }, 50);
    }
}

// 切换回复列表显示
function toggleReplies(messageId) {
    const repliesDiv = document.getElementById(`replies-${messageId}`);
    const toggleBtn = repliesDiv.closest('.message').querySelector('.toggle-btn');
    
    if (repliesDiv.classList.contains('collapsed')) {
        repliesDiv.classList.remove('collapsed');
        toggleBtn.textContent = `收起回复 (${repliesDiv.children.length})`;
    } else {
        repliesDiv.classList.add('collapsed');
        toggleBtn.textContent = `展开回复 (${repliesDiv.children.length})`;
    }
}

// 切换嵌套回复列表显示 - 修复后的版本
function toggleNestedReplies(replyIdStr) {
    const nestedRepliesDiv = document.getElementById(`nested-replies-${replyIdStr}`);
    const replyElement = document.getElementById(`reply-${replyIdStr}`);
    
    if (nestedRepliesDiv && replyElement) {
        const toggleBtn = replyElement.querySelector('.toggle-btn');
        
        if (nestedRepliesDiv.classList.contains('collapsed')) {
            nestedRepliesDiv.classList.remove('collapsed');
            if (toggleBtn) {
                toggleBtn.textContent = `收起回复 (${nestedRepliesDiv.children.length})`;
            }
        } else {
            nestedRepliesDiv.classList.add('collapsed');
            if (toggleBtn) {
                toggleBtn.textContent = `展开回复 (${nestedRepliesDiv.children.length})`;
            }
        }
    }
}

// 提交回复
function submitReply(messageId, parentReplyId = null, parentAuthor = null) {
    const replyAuthorInput = document.getElementById(`reply-author-${messageId}`);
    const replyContentInput = document.getElementById(`reply-content-${messageId}`);
    
    const author = replyAuthorInput.value.trim();
    const content = replyContentInput.value.trim();
    
    if (!author || !content) {
        alert('请填写完整回复信息！');
        return;
    }
    
    const reply = {
        id: Date.now(),
        author: author,
        content: content,
        time: new Date().toLocaleString(),
        replies: [],
        parentAuthor: parentAuthor || null
    };
    
    saveReply(messageId, reply);
    
    const replyForm = document.getElementById(`reply-form-${messageId}`);
    replyForm.classList.remove('active');
    replyAuthorInput.value = '';
    replyContentInput.value = '';
    
    loadMessages();
}

// 提交对回复的回复 - 修复重新加载逻辑
function submitReplyToReply(messageId, replyId, formId, replyAuthor) {
    const replyAuthorInput = document.getElementById(`reply-author-${formId}`);
    const replyContentInput = document.getElementById(`reply-content-${formId}`);
    
    const author = replyAuthorInput.value.trim();
    const content = replyContentInput.value.trim();
    
    if (!author || !content) {
        alert('请填写完整回复信息！');
        return;
    }
    
    const nestedReply = {
        id: Date.now(),
        author: author,
        content: content,
        time: new Date().toLocaleString(),
        replies: [],
        parentAuthor: replyAuthor
    };
    
    // 先清空表单
    const replyForm = document.getElementById(`reply-form-${formId}`);
    replyForm.classList.remove('active');
    replyAuthorInput.value = '';
    replyContentInput.value = '';
    
    // 保存嵌套回复
    saveReplyToReply(messageId, replyId, nestedReply);
    
    // 添加立即重新加载，确保显示最新数据
    setTimeout(() => {
        loadMessages();
    }, 200);
}

// =============================================
// 页面初始化
// =============================================

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkLoginStatus();
    
    // 加载留言列表
    loadMessages();
    
    // 为置顶按钮添加点击事件
    const pinBtn = document.getElementById('pin-window-btn');
    if (pinBtn) {
        pinBtn.addEventListener('click', toggleWindowPin);
    }
    
    // 确保留言表单的输入框可以获取焦点
    setTimeout(() => {
        const authorInput = document.getElementById('author');
        const contentInput = document.getElementById('content');
        if (authorInput) {
            authorInput.tabIndex = 0;
            authorInput.focus();
        }
        if (contentInput) {
            contentInput.tabIndex = 0;
        }
        
        // 确保所有回复表单的输入框可以获取焦点
        const replyForms = document.querySelectorAll('.reply-form');
        replyForms.forEach(form => {
            const inputs = form.querySelectorAll('input[type="text"], textarea');
            inputs.forEach(input => {
                input.tabIndex = 0;
            });
        });
    }, 100);
    
    // 留言表单提交事件处理
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const authorInput = document.getElementById('author');
            const contentInput = document.getElementById('content');
            
            const author = authorInput.value.trim();
            const content = contentInput.value.trim();
            
            if (!author || !content) {
                alert('请填写完整信息！');
                return;
            }
            
            const message = {
                id: Date.now(),
                author: author,
                content: content,
                time: new Date().toLocaleString(),
                replies: []
            };
            
            saveMessage(message);
            alert('留言提交成功！');
            messageForm.reset();
            
            // 确保留言列表刷新
            setTimeout(() => {
                loadMessages();
            }, 100);
        });
    }
});