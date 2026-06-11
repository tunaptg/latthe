// Đăng ký Service Worker cho PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker đã đăng ký thành công:', reg))
            .catch(err => console.log('Lỗi đăng ký Service Worker:', err));
    });
}

// Đổi link ảnh thành thư mục cục bộ theo đúng yêu cầu
const IMGS = { 
    1: "1.png", 2: "2.png", 3: "3.png", 
    4: "4.png", 5: "5.png", 6: "6.png", 
    7: "7.png", 8: "8.png", 9: "9.png" 
};

let isMuted = false, rows = 3, cols = 8, curImg = null, firstChoice = null;
let historyStack = [];
let tempRows = 3, tempCols = 8;
let dragClone = null, draggedImgId = null;

const ctx = new (window.AudioContext || window.webkitAudioContext)();
function triggerSound(type) { 
    if (isMuted) return; 
    if (ctx.state === 'suspended') ctx.resume(); 
    const osc = ctx.createOscillator(); 
    const gain = ctx.createGain(); 
    osc.connect(gain); gain.connect(ctx.destination); 
    osc.frequency.setValueAtTime(type==='match'?880:350, ctx.currentTime); 
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1); 
    osc.start(); osc.stop(ctx.currentTime + 0.1); 
}

window.closePopup = function(e) { 
    if(e) e.preventDefault();
    document.getElementById('pt-popup-overlay').classList.remove('show'); 
    triggerSound('click'); 
}

// TỐI ƯU HÓA LƯU TRỮ
function getImgId(htmlStr) {
    if (!htmlStr) return 0;
    for(let i=1; i<=9; i++) {
        if (htmlStr.includes(IMGS[i])) return i;
    }
    return 0;
}

function saveToStorage() {
    const gridState = Array.from(document.querySelectorAll(".game-cell")).map(cell => ({
        id: getImgId(cell.innerHTML),
        locked: cell.classList.contains("is-locked")
    }));
    const data = { rows, cols, gridState, historyStack };
    localStorage.setItem('pt_game_data_save', JSON.stringify(data));
}

function saveHistory() {
    const gridState = Array.from(document.querySelectorAll(".game-cell")).map(cell => ({
        id: getImgId(cell.innerHTML),
        locked: cell.classList.contains("is-locked")
    }));
    historyStack.push(gridState);
    if(historyStack.length > 50) historyStack.shift();
}

function loadFromStorage() {
    const saved = localStorage.getItem('pt_game_data_save');
    if (!saved) return false;
    try {
        const data = JSON.parse(saved);
        rows = data.rows; cols = data.cols;
        tempRows = rows; tempCols = cols; 
        historyStack = data.historyStack || []; 
        updateSlidersUI();
        renderBoard(true); 
        const cells = document.querySelectorAll(".game-cell");
        data.gridState.forEach((state, idx) => {
            if (cells[idx]) {
                cells[idx].innerHTML = state.id > 0 ? `<img src="${IMGS[state.id]}" draggable="false"/>` : "";
                if (state.locked) cells[idx].classList.add("is-locked");
            }
        });
        return true;
    } catch(e) { return false; }
}

// UI SLIDERS CẤU HÌNH
function updateSlidersUI() { 
    document.getElementById('row-slider').value = tempRows;
    document.getElementById('row-val').innerText = tempRows;
    document.getElementById('col-slider').value = tempCols;
    document.getElementById('col-val').innerText = tempCols;
}

document.getElementById('row-slider').addEventListener('input', (e) => {
    tempRows = parseInt(e.target.value);
    document.getElementById('row-val').innerText = tempRows;
});
document.getElementById('col-slider').addEventListener('input', (e) => {
    tempCols = parseInt(e.target.value);
    document.getElementById('col-val').innerText = tempCols;
});

// RENDER BẢNG CHƠI & LẮNG NGHE POINTER EVENTS
function renderBoard(isLoading = false){ 
    const grid = document.getElementById("game-grid"); 
    if(!isLoading) {
        rows = tempRows; cols = tempCols; historyStack = []; 
    }
    grid.innerHTML = ""; grid.style.setProperty('--cols', cols); 
    firstChoice = null;
    for(let i=0; i < rows * cols; i++){ 
        const cell = document.createElement("div"); 
        cell.className = "game-cell"; 
        cell.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            handleCellClick(cell);
        });
        grid.appendChild(cell); 
    } 
    renderIcons(); 
    saveToStorage();
}

function handleCellClick(cell) {
    if(cell.classList.contains("is-locked")) return;
    if(curImg) {
        if(cell.innerHTML) return;
        saveHistory();
        cell.innerHTML = `<img src="${curImg}" draggable="false"/>`;
        curImg = null; draggedImgId = null;
        triggerSound('click');
        document.querySelectorAll(".icon-item").forEach(i => i.classList.remove("selected"));
        saveToStorage(); return;
    }
    if(cell.innerHTML) {
        if(!firstChoice) {
            firstChoice = cell;
            cell.style.background = "#FFD700"; cell.style.boxShadow = "0 4px 0 #FFA500";
            triggerSound('click');
        } else {
            if(firstChoice === cell) {
                saveHistory();
                cell.innerHTML = "";
                cell.style.background = "#FFFFFF"; cell.style.boxShadow = "0 4px 0 #87CEFA";
                firstChoice = null; triggerSound('click'); saveToStorage();
            } else if(firstChoice.querySelector("img").src === cell.querySelector("img").src) {
                saveHistory(); triggerSound('match');
                firstChoice.innerHTML = cell.innerHTML = "";
                firstChoice.classList.add("is-locked"); cell.classList.add("is-locked");
                firstChoice.style.background = cell.style.background = "#FFFFFF"; 
                firstChoice.style.boxShadow = cell.style.boxShadow = "none";
                firstChoice = null; saveToStorage();
            } else {
                firstChoice.style.background = "#FFFFFF"; firstChoice.style.boxShadow = "0 4px 0 #87CEFA";
                firstChoice = cell;
                cell.style.background = "#FFD700"; cell.style.boxShadow = "0 4px 0 #FFA500";
                triggerSound('click');
            }
        }
    }
}

// RENDER ICON VÀ KÉO THẢ (DRAG & DROP)
function renderIcons() { 
    const container = document.getElementById("icons-container"); 
    container.innerHTML = ""; 
    for(let i=1; i<=9; i++) { 
        const item = document.createElement("div"); 
        item.className = "icon-item"; 
        item.innerHTML = `<img src="${IMGS[i]}" draggable="false"/>`; 
        
        item.addEventListener('pointerdown', (e) => { 
            e.preventDefault(); 
            curImg = IMGS[i]; draggedImgId = i;
            document.querySelectorAll(".icon-item").forEach(el => el.classList.remove("selected")); 
            item.classList.add("selected"); 
            if(firstChoice) { 
                firstChoice.style.background = "#FFFFFF"; 
                firstChoice.style.boxShadow = "0 4px 0 #87CEFA";
                firstChoice = null; 
            }
            triggerSound('click'); 

            const rect = item.getBoundingClientRect();
            dragClone = document.createElement("div");
            dragClone.className = "icon-item drag-clone";
            dragClone.innerHTML = `<img src="${IMGS[i]}" draggable="false"/>`;
            dragClone.style.width = rect.width + 'px';
            dragClone.style.height = rect.height + 'px';
            dragClone.style.left = (e.clientX - rect.width/2) + 'px';
            dragClone.style.top = (e.clientY - rect.height/2) + 'px';
            document.body.appendChild(dragClone);
            
            item.setPointerCapture(e.pointerId); 
        }); 
        
        item.addEventListener('pointermove', (e) => {
            if(dragClone) {
                const rect = dragClone.getBoundingClientRect();
                dragClone.style.left = (e.clientX - rect.width/2) + 'px';
                dragClone.style.top = (e.clientY - rect.height/2) + 'px';
            }
        });

        item.addEventListener('pointerup', (e) => {
            item.releasePointerCapture(e.pointerId);
            if(dragClone) {
                dragClone.remove(); dragClone = null;
                
                const target = document.elementFromPoint(e.clientX, e.clientY);
                const cell = target ? target.closest('.game-cell') : null;
                
                if(cell && !cell.classList.contains("is-locked") && !cell.innerHTML) {
                    saveHistory();
                    cell.innerHTML = `<img src="${IMGS[draggedImgId]}" draggable="false"/>`;
                    triggerSound('click'); saveToStorage();
                    curImg = null; draggedImgId = null;
                    document.querySelectorAll(".icon-item").forEach(el => el.classList.remove("selected"));
                }
            }
        });

        container.appendChild(item); 
    } 
}

// XỬ LÝ SỰ KIỆN CÁC NÚT BẤM
document.getElementById("hint-btn").addEventListener("pointerdown", function(e) {
    e.preventDefault();
    const cells = document.querySelectorAll(".game-cell:not(.is-locked)");
    const map = {}; let found = false;
    
    cells.forEach(cell => {
        const id = getImgId(cell.innerHTML);
        if(id > 0) {
            if(!map[id]) map[id] = [];
            map[id].push(cell);
        }
    });
    
    for(let id in map) {
        if(map[id].length >= 2) {
            triggerSound('click');
            map[id][0].classList.add("is-hinting");
            map[id][1].classList.add("is-hinting");
            setTimeout(() => {
                map[id][0].classList.remove("is-hinting");
                map[id][1].classList.remove("is-hinting");
            }, 3000);
            found = true; break;
        }
    }
    
    if(!found) {
        triggerSound('click');
        this.classList.add("shake");
        setTimeout(() => this.classList.remove("shake"), 400);
    }
});

document.getElementById("undo-btn").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if(historyStack.length === 0) return;
    triggerSound('click');
    const prevState = historyStack.pop();
    const cells = document.querySelectorAll(".game-cell");
    prevState.forEach((state, idx) => {
        if (cells[idx]) {
            cells[idx].innerHTML = state.id > 0 ? `<img src="${IMGS[state.id]}" draggable="false"/>` : "";
            cells[idx].style.background = "#FFFFFF";
            cells[idx].style.boxShadow = "0 4px 0 #87CEFA";
            if(state.locked) {
                cells[idx].classList.add("is-locked");
                cells[idx].style.boxShadow = "none";
            }
            else cells[idx].classList.remove("is-locked");
        }
    });
    firstChoice = null; saveToStorage(); 
});

document.getElementById("reset-btn").addEventListener("pointerdown", (e) => { 
    e.preventDefault();
    if(confirm("Bạn có chắc muốn xóa toàn bộ bảng hiện tại và áp dụng kích thước mới?")) {
        renderBoard(); triggerSound('click'); 
    }
});

document.getElementById("mute-btn").addEventListener("pointerdown", function(e) { 
    e.preventDefault();
    isMuted = !isMuted; 
    this.innerText = isMuted ? "🔈" : "🔊"; 
    this.style.transform = isMuted ? "scale(0.8)" : "scale(1)";
});

window.onload = () => { 
    document.getElementById('pt-popup-overlay').classList.add('show'); 
    if (!loadFromStorage()) {
        updateSlidersUI(); 
        renderBoard(); 
    }
};

setInterval(() => { 
    const diff = new Date("2026-06-26 06:59:59").getTime() - new Date().getTime(); 
    if (diff <= 0) {
        document.getElementById("timer-text").innerText = "Sự kiện đã kết thúc";
        return;
    }
    const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000); 
    document.getElementById("timer-text").innerText = `${d} ngày : ${h}h : ${m}m : ${s}s`; 
}, 1000);