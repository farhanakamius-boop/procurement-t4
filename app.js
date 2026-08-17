// State Management
let studentProgress = {
    name: "Ahmad Faiz bin Roslan",
    notesRead: [], // Array of section IDs read
    game1Completed: false,
    game1Score: 0,
    game2Completed: false,
    game2Score: 0,
    quizCompleted: false,
    quizScore: 0,
    quizAnswers: null,
    game2Report: null
};

// Satu kali reset automatik untuk membersihkan kemajuan terdahulu
if (!localStorage.getItem("procurement_reset_done")) {
    localStorage.removeItem("procurement_student_progress");
    localStorage.setItem("procurement_reset_done", "true");
}

// // Auth State variables
let userRole = "guest"; // "guest" | "student" | "lecturer"
let studentId = "";

// Mock Students Database for Lecturer Panel
let mockStudents = [];

function loadMockStudents() {
    const saved = localStorage.getItem("procurement_lecturer_students");
    if (saved) {
        try {
            mockStudents = JSON.parse(saved);
        } catch (e) {
            console.error("Error loading mock students", e);
        }
    } else {
        mockStudents = [];
    }
}

function saveMockStudents() {
    localStorage.setItem("procurement_lecturer_students", JSON.stringify(mockStudents));
}

// Active tab and navigation states
let currentTab = "utama";
let activeNoteSection = "s4-1";

// DOM Loaded Event
document.addEventListener("DOMContentLoaded", () => {
    loadMockStudents();
    initProgress();
    setupNavigation();
    setupNoteInteractivity();
    setupGame1();
    setupGame2();
    setupQuiz();
    setupLecturerPanel();
});

// Toast Notification Utility
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `alert-toast active ${type}`;
    
    setTimeout(() => {
        toast.className = "alert-toast";
    }, 3500);
}

// 1. Progress Management
function initProgress() {
    const sessionRole = sessionStorage.getItem("user_role");
    
    if (sessionRole === "student") {
        userRole = "student";
        const name = sessionStorage.getItem("student_name");
        const id = sessionStorage.getItem("student_id");
        studentId = id;
        
        const savedProgressKey = `procurement_progress_${name.toLowerCase().replace(/\s+/g, '_')}`;
        const saved = localStorage.getItem(savedProgressKey);
        if (saved) {
            try {
                studentProgress = JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing progress", e);
            }
        } else {
            studentProgress.name = name;
            studentProgress.id = id;
        }
        
        document.getElementById("badge-student-name").textContent = name;
        document.getElementById("header-progress-badge").style.display = "flex";
        
        setupRoleUI("student");
        
        document.getElementById("login-container").classList.add("hidden");
        document.getElementById("app-container").classList.remove("hidden");
        
        switchTab("utama");
        updateUI();
    } else if (sessionRole === "lecturer") {
        userRole = "lecturer";
        
        document.getElementById("header-progress-badge").style.display = "none";
        
        setupRoleUI("lecturer");
        
        document.getElementById("login-container").classList.add("hidden");
        document.getElementById("app-container").classList.remove("hidden");
        
        switchTab("pensyarah");
        updateLecturerTable();
        updateLecturerCharts();
    } else {
        document.getElementById("app-container").classList.add("hidden");
        document.getElementById("login-container").classList.remove("hidden");
    }
}

function saveProgress() {
    const activeKey = localStorage.getItem("procurement_active_student_key") || "procurement_student_progress";
    localStorage.setItem(activeKey, JSON.stringify(studentProgress));
    localStorage.setItem("procurement_student_progress", JSON.stringify(studentProgress));
    
    updateUI();
    syncActiveStudentToMock();
}

function syncActiveStudentToMock() {
    if (userRole !== "student") return;
    
    const totalProg = calculateOverallProgress(studentProgress);
    const existingIdx = mockStudents.findIndex(s => s.name === studentProgress.name);
    
    const studentData = {
        id: studentProgress.id || studentId || "ACTIVE",
        name: studentProgress.name,
        notesRead: studentProgress.notesRead,
        game1Completed: studentProgress.game1Completed,
        game1Score: studentProgress.game1Score,
        game2Completed: studentProgress.game2Completed,
        game2Score: studentProgress.game2Score,
        quizCompleted: studentProgress.quizCompleted,
        quizScore: studentProgress.quizScore,
        quizAnswers: studentProgress.quizAnswers,
        game2Report: studentProgress.game2Report
    };

    if (existingIdx !== -1) {
        mockStudents[existingIdx] = studentData;
    } else {
        mockStudents.unshift(studentData);
    }
    
    saveMockStudents();
    
    if (typeof updateLecturerTable === "function") {
        updateLecturerTable();
        updateLecturerCharts();
    }
}

function calculateOverallProgress(prog) {
    // Total progress components:
    // - 5 note sections = 25% (5% each)
    // - Game 1 = 25%
    // - Game 2 = 25%
    // - Quiz = 25%
    const notesWeight = (prog.notesRead.length / 5) * 25;
    const game1Weight = prog.game1Completed ? 25 : 0;
    const game2Weight = prog.game2Completed ? 25 : 0;
    const quizWeight = prog.quizCompleted ? 25 : 0;
    
    return Math.round(notesWeight + game1Weight + game2Weight + quizWeight);
}

function resetAllProgress() {
    studentProgress = {
        name: "Ahmad Faiz bin Roslan",
        notesRead: [],
        game1Completed: false,
        game1Score: 0,
        game2Completed: false,
        game2Score: 0,
        quizCompleted: false,
        quizScore: 0,
        quizAnswers: null,
        game2Report: null
    };
    saveProgress();
    
    // Reset Games & Quiz UI states
    resetGame1UI();
    resetGame2UI();
    resetQuizUI();
    
    showToast("Kemajuan pembelajaran anda telah diset semula ke 0%!", "warning");
    switchTab("utama");
}

function updateUI() {
    const overallProgress = calculateOverallProgress(studentProgress);
    
    // Update progress bars & texts
    document.querySelectorAll(".overall-progress-pct").forEach(el => {
        el.textContent = `${overallProgress}%`;
    });
    
    document.querySelectorAll(".progress-fill-mini").forEach(el => {
        el.style.width = `${overallProgress}%`;
    });
    
    // Welcome dashboard stats
    document.getElementById("db-notes-read").textContent = `${studentProgress.notesRead.length}/5`;
    document.getElementById("db-game1-score").textContent = studentProgress.game1Completed ? `${studentProgress.game1Score}/100` : "Belum Selesai";
    document.getElementById("db-game2-score").textContent = studentProgress.game2Completed ? `${studentProgress.game2Score}/100` : "Belum Selesai";
    document.getElementById("db-quiz-score").textContent = studentProgress.quizCompleted ? `${studentProgress.quizScore}%` : "Belum Selesai";
    
    // Profile Sidebar states
    document.getElementById("profile-percentage").textContent = `${overallProgress}%`;
    document.getElementById("profile-notes").textContent = `${studentProgress.notesRead.length}/5`;
    document.getElementById("profile-games").textContent = `${(studentProgress.game1Completed ? 1 : 0) + (studentProgress.game2Completed ? 1 : 0)}/2`;
    document.getElementById("profile-quiz").textContent = studentProgress.quizCompleted ? `${studentProgress.quizScore}%` : "N/A";

    // Dynamic Profile Name, ID and Avatar initials
    if (studentProgress.name) {
        document.getElementById("profile-student-name").textContent = studentProgress.name;
        const initials = studentProgress.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
        document.getElementById("profile-avatar").textContent = initials;
    }
    if (studentProgress.id) {
        document.getElementById("profile-student-id").textContent = `No. Pelajar: ${studentProgress.id}`;
    }
}

// 2. Navigation Control
function setupNavigation() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    currentTab = tabId;
    
    // Toggle active tab buttons
    document.querySelectorAll(".tab-btn").forEach(btn => {
        if (btn.getAttribute("data-tab") === tabId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    
    // Toggle active tab content
    document.querySelectorAll(".tab-content").forEach(content => {
        if (content.id === `${tabId}-tab`) {
            content.classList.add("active");
        } else {
            content.classList.remove("active");
        }
    });

    if (tabId === "pensyarah") {
        updateLecturerTable();
        updateLecturerCharts();
    }
}

// 3. Notes Interactivity
function setupNoteInteractivity() {
    // Sidebar Navigation within Notes
    document.querySelectorAll(".sidebar-link").forEach(link => {
        link.addEventListener("click", () => {
            const sectionId = link.getAttribute("data-section");
            switchNoteSection(sectionId);
        });
    });

    // Expandable 10 Factors Cards
    document.querySelectorAll(".factor-card").forEach(card => {
        card.addEventListener("click", () => {
            card.classList.toggle("expanded");
        });
    });

    // Interactive Weighted Calculator sandbox in notes 4.3
    const calcInputs = document.querySelectorAll(".interactive-calc .calc-input");
    calcInputs.forEach(input => {
        input.addEventListener("input", calculateSandboxScore);
    });
    calculateSandboxScore(); // initial computation

    // Mini Defect Rate Calculator sandbox in notes 4.5
    const receivedInput = document.getElementById("sandbox-received");
    const damagedInput = document.getElementById("sandbox-damaged");
    if (receivedInput && damagedInput) {
        [receivedInput, damagedInput].forEach(inp => {
            inp.addEventListener("input", () => {
                const received = parseFloat(receivedInput.value) || 0;
                const damaged = parseFloat(damagedInput.value) || 0;
                const resultSpan = document.getElementById("sandbox-rate-result");
                
                if (received <= 0) {
                    resultSpan.textContent = "0.00%";
                    return;
                }
                const rate = (damaged / received) * 100;
                resultSpan.textContent = `${rate.toFixed(2)}%`;
            });
        });
    }
}

function switchNoteSection(sectionId) {
    activeNoteSection = sectionId;
    
    // Update sidebar links
    document.querySelectorAll(".sidebar-link").forEach(link => {
        if (link.getAttribute("data-section") === sectionId) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
    
    // Update content sections
    document.querySelectorAll(".note-section").forEach(sec => {
        if (sec.id === sectionId) {
            sec.classList.add("active");
        } else {
            sec.classList.remove("active");
        }
    });
    
    // Mark section as read
    if (!studentProgress.notesRead.includes(sectionId)) {
        studentProgress.notesRead.push(sectionId);
        saveProgress();
    }
}

function calculateSandboxScore() {
    const wKualiti = (parseFloat(document.getElementById("calc-w-kualiti").value) || 0) / 100;
    const wKos = (parseFloat(document.getElementById("calc-w-kos").value) || 0) / 100;
    const wOtif = (parseFloat(document.getElementById("calc-w-otif").value) || 0) / 100;
    
    // Scores:
    // A: Kualiti=4, Kos=3, OTIF=5
    // B: Kualiti=5, Kos=2, OTIF=3
    const scoreA = (4 * wKualiti) + (3 * wKos) + (5 * wOtif);
    const scoreB = (5 * wKualiti) + (2 * wKos) + (3 * wOtif);
    
    document.getElementById("calc-score-a").textContent = scoreA.toFixed(2);
    document.getElementById("calc-score-b").textContent = scoreB.toFixed(2);
    
    const sum = (wKualiti + wKos + wOtif) * 100;
    const warningText = document.getElementById("calc-weight-warning");
    if (Math.abs(sum - 100) > 0.01) {
        warningText.style.display = "block";
        warningText.textContent = `Amaran: Jumlah wajaran mestilah 100% (Jumlah semasa: ${sum.toFixed(0)}%)`;
    } else {
        warningText.style.display = "none";
    }
}

// 4. Game 1: Weighted Method Challenge
const targetGame1Weights = { kualiti: 40, kos: 10, otif: 30, it: 10, kewangan: 10 };
let currentSliders = { kualiti: 20, kos: 20, otif: 20, it: 20, kewangan: 20 };

function setupGame1() {
    const sliders = ["kualiti", "kos", "otif", "it", "kewangan"];
    sliders.forEach(key => {
        const slider = document.getElementById(`g1-w-${key}`);
        if (!slider) return;
        
        slider.addEventListener("input", (e) => {
            currentSliders[key] = parseInt(e.target.value);
            document.getElementById(`g1-val-${key}`).textContent = `${currentSliders[key]}%`;
            updateGame1Scores();
        });
    });

    const submitBtn = document.getElementById("game1-submit-btn");
    if (submitBtn) {
        submitBtn.addEventListener("click", validateGame1Answer);
    }
    
    updateGame1Scores();
}

function updateGame1Scores() {
    const sum = currentSliders.kualiti + currentSliders.kos + currentSliders.otif + currentSliders.it + currentSliders.kewangan;
    const warning = document.getElementById("game1-weight-warning");
    const submitBtn = document.getElementById("game1-submit-btn");
    
    if (warning && submitBtn) {
        if (sum !== 100) {
            warning.className = "weight-sum-warning";
            warning.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Jumlah wajaran mestilah 100% (Semasa: ${sum}%)`;
            submitBtn.disabled = true;
        } else {
            warning.className = "weight-sum-ok";
            warning.innerHTML = `<i class="fas fa-check-circle"></i> Jumlah wajaran: 100%`;
            submitBtn.disabled = false;
        }
    }

    // Compute and display supplier scores based on sliders
    // Ratings:
    // Alpha: Kualiti=4, Kos=3, OTIF=5, IT=4, Kewangan=3
    // Beta: Kualiti=5, Kos=2, OTIF=3, IT=3, Kewangan=4
    // Gamma: Kualiti=3, Kos=5, OTIF=2, IT=4, Kewangan=5
    const wKualiti = currentSliders.kualiti / 100;
    const wKos = currentSliders.kos / 100;
    const wOtif = currentSliders.otif / 100;
    const wIt = currentSliders.it / 100;
    const wKewangan = currentSliders.kewangan / 100;

    const scoreAlpha = (4 * wKualiti) + (3 * wKos) + (5 * wOtif) + (4 * wIt) + (3 * wKewangan);
    const scoreBeta = (5 * wKualiti) + (2 * wKos) + (3 * wOtif) + (3 * wIt) + (4 * wKewangan);
    const scoreGamma = (3 * wKualiti) + (5 * wKos) + (2 * wOtif) + (4 * wIt) + (5 * wKewangan);

    document.getElementById("g1-score-alpha").textContent = scoreAlpha.toFixed(2);
    document.getElementById("g1-score-beta").textContent = scoreBeta.toFixed(2);
    document.getElementById("g1-score-gamma").textContent = scoreGamma.toFixed(2);
}

function validateGame1Answer() {
    const selectedSupplier = document.querySelector('input[name="game1-best-supplier"]:checked');
    if (!selectedSupplier) {
        showToast("Sila pilih pembekal terbaik terlebih dahulu!", "error");
        return;
    }

    // Check sliders matches target
    const matchesTarget = 
        currentSliders.kualiti === targetGame1Weights.kualiti &&
        currentSliders.kos === targetGame1Weights.kos &&
        currentSliders.otif === targetGame1Weights.otif &&
        currentSliders.it === targetGame1Weights.it &&
        currentSliders.kewangan === targetGame1Weights.kewangan;

    const isAlphaBest = selectedSupplier.value === "Alpha";

    if (matchesTarget && isAlphaBest) {
        studentProgress.game1Completed = true;
        studentProgress.game1Score = 100;
        saveProgress();
        
        // Show success layout
        document.getElementById("game1-play-view").style.display = "none";
        document.getElementById("game1-success-view").style.display = "block";
        showToast("Syabas! Anda telah melaraskan matriks pemberat dengan tepat!", "success");
    } else {
        let errorMsg = "Jawapan tidak tepat. ";
        if (!matchesTarget) {
            errorMsg += "Laraskan wajaran kriteria mengikut matlamat syarikat (Kualiti 40%, OTIF 30%, Kos 10%, IT 10%, Kewangan 10%). ";
        } else if (!isAlphaBest) {
            errorMsg += "Pilihan pembekal terbaik anda salah berdasarkan pengiraan.";
        }
        showToast(errorMsg, "error");
    }
}

function startMiniGame1() {
    document.getElementById("games-selection-view").style.display = "none";
    document.getElementById("game1-container").style.display = "block";
    
    if (studentProgress.game1Completed) {
        document.getElementById("game1-play-view").style.display = "none";
        document.getElementById("game1-success-view").style.display = "block";
    } else {
        document.getElementById("game1-play-view").style.display = "block";
        document.getElementById("game1-success-view").style.display = "none";
    }
}

function exitGame1() {
    document.getElementById("game1-container").style.display = "none";
    document.getElementById("games-selection-view").style.display = "block";
}

function resetGame1UI() {
    currentSliders = { kualiti: 20, kos: 20, otif: 20, it: 20, kewangan: 20 };
    const sliders = ["kualiti", "kos", "otif", "it", "kewangan"];
    sliders.forEach(key => {
        const slider = document.getElementById(`g1-w-${key}`);
        if (slider) {
            slider.value = 20;
            document.getElementById(`g1-val-${key}`).textContent = "20%";
        }
    });
    
    const checkedRadio = document.querySelector('input[name="game1-best-supplier"]:checked');
    if (checkedRadio) checkedRadio.checked = false;
    
    updateGame1Scores();
}

// 5. Game 2: Warehouse Inspection & NCR
let crates = [];
const totalCratesCount = 30;
let inspectedCrates = 0;
let damagedBottlesTotal = 0;
let okBottlesTotal = 0;

function setupGame2() {
    const submitBtn = document.getElementById("game2-submit-btn");
    if (submitBtn) {
        submitBtn.addEventListener("click", validateGame2Answer);
    }
}

function startMiniGame2() {
    document.getElementById("games-selection-view").style.display = "none";
    document.getElementById("game2-container").style.display = "block";
    
    if (studentProgress.game2Completed) {
        document.getElementById("game2-play-view").style.display = "none";
        document.getElementById("game2-success-view").style.display = "block";
        // Show report details in success view
        if (studentProgress.game2Report) {
            document.getElementById("game2-final-defect").textContent = studentProgress.game2Report.defectRate;
            document.getElementById("game2-final-shortage").textContent = studentProgress.game2Report.shortage;
        }
    } else {
        document.getElementById("game2-play-view").style.display = "block";
        document.getElementById("game2-success-view").style.display = "none";
        initWarehouseGrid();
    }
}

function initWarehouseGrid() {
    inspectedCrates = 0;
    damagedBottlesTotal = 0;
    okBottlesTotal = 0;
    
    // 30 crates, 25 crates elok (30 per crate), 5 crates damaged (30 damaged per crate)
    // Total: 900 bottles (25*30 = 750 elok, 5*30 = 150 pecah)
    crates = [];
    for (let i = 0; i < 25; i++) {
        crates.push({ id: i + 1, type: "ok", qty: 30 });
    }
    for (let i = 0; i < 5; i++) {
        crates.push({ id: 25 + i + 1, type: "damaged", qty: 30 });
    }
    
    // Shuffle crates
    crates.sort(() => Math.random() - 0.5);
    
    // Build HTML grid
    const grid = document.getElementById("warehouse-grid");
    grid.innerHTML = "";
    
    crates.forEach((crate, idx) => {
        const crateDiv = document.createElement("div");
        crateDiv.className = "crate-box";
        crateDiv.dataset.idx = idx;
        crateDiv.innerHTML = `<i class="fas fa-box"></i><span class="crate-box-qty">Kotak ${idx+1}</span>`;
        
        crateDiv.addEventListener("click", () => inspectCrate(crateDiv, idx));
        grid.appendChild(crateDiv);
    });

    updateGame2ProgressUI();
    document.getElementById("game2-form-card").style.opacity = "0.5";
    document.getElementById("game2-form-card").style.pointerEvents = "none";
}

function inspectCrate(el, idx) {
    if (el.classList.contains("inspected")) return;
    
    const crate = crates[idx];
    el.classList.add("inspected");
    inspectedCrates++;
    
    if (crate.type === "ok") {
        el.classList.add("inspected-ok");
        el.innerHTML = `<i class="fas fa-check"></i><span class="crate-box-qty">30 Elok</span>`;
        okBottlesTotal += crate.qty;
    } else {
        el.classList.add("inspected-damaged");
        el.innerHTML = `<i class="fas fa-times-circle"></i><span class="crate-box-qty">30 Pecah</span>`;
        damagedBottlesTotal += crate.qty;
    }
    
    updateGame2ProgressUI();
    
    if (inspectedCrates === totalCratesCount) {
        // Unlock form
        const formCard = document.getElementById("game2-form-card");
        formCard.style.opacity = "1";
        formCard.style.pointerEvents = "auto";
        showToast("Semua kotak telah diperiksa! Sila lengkapkan laporan Audit Gudang sekarang.", "warning");
    }
}

function updateGame2ProgressUI() {
    document.getElementById("g2-inspected-count").textContent = inspectedCrates;
    document.getElementById("g2-total-count").textContent = totalCratesCount;
    document.getElementById("g2-ok-bottles").textContent = okBottlesTotal;
    document.getElementById("g2-damaged-bottles").textContent = damagedBottlesTotal;
}

function validateGame2Answer() {
    const poQty = parseInt(document.getElementById("g2-po-qty").value) || 0;
    const doQty = parseInt(document.getElementById("g2-do-qty").value) || 0;
    const shortageQty = parseInt(document.getElementById("g2-shortage-qty").value) || 0;
    const damagedQty = parseInt(document.getElementById("g2-damaged-qty").value) || 0;
    const defectRate = parseFloat(document.getElementById("g2-defect-rate").value) || 0;
    const docType = document.getElementById("g2-doc-type").value;
    const actionPlan = document.getElementById("g2-action-plan").value;

    let hasErrors = false;
    
    // Validations:
    // PO = 1000, DO = 900, Shortage = 100, Damaged = 150, Defect Rate = 16.67%, docType = "both", actionPlan = "replace"
    
    if (poQty !== 1000) {
        highlightError("g2-po-qty");
        hasErrors = true;
    } else removeHighlight("g2-po-qty");

    if (doQty !== 900) {
        highlightError("g2-do-qty");
        hasErrors = true;
    } else removeHighlight("g2-do-qty");

    if (shortageQty !== 100) {
        highlightError("g2-shortage-qty");
        hasErrors = true;
    } else removeHighlight("g2-shortage-qty");

    if (damagedQty !== 150) {
        highlightError("g2-damaged-qty");
        hasErrors = true;
    } else removeHighlight("g2-damaged-qty");

    // Allow 16.6 to 16.7
    if (defectRate < 16.6 || defectRate > 16.7) {
        highlightError("g2-defect-rate");
        hasErrors = true;
    } else removeHighlight("g2-defect-rate");

    if (docType !== "both") {
        highlightError("g2-doc-type");
        hasErrors = true;
    } else removeHighlight("g2-doc-type");

    if (actionPlan !== "replace") {
        highlightError("g2-action-plan");
        hasErrors = true;
    } else removeHighlight("g2-action-plan");

    if (hasErrors) {
        showToast("Laporan anda tidak tepat! Sila periksa input yang ditandakan merah.", "error");
    } else {
        studentProgress.game2Completed = true;
        studentProgress.game2Score = 100;
        studentProgress.game2Report = {
            po: poQty,
            do: doQty,
            shortage: shortageQty,
            damaged: damagedQty,
            defectRate: `${defectRate}%`,
            docType: docType,
            action: actionPlan
        };
        saveProgress();
        
        document.getElementById("game2-play-view").style.display = "none";
        document.getElementById("game2-success-view").style.display = "block";
        document.getElementById("game2-final-defect").textContent = `${defectRate}%`;
        document.getElementById("game2-final-shortage").textContent = shortageQty;
        
        showToast("Tahniah! Laporan Audit Gudang dan NCR anda telah diluluskan!", "success");
    }
}

function highlightError(id) {
    document.getElementById(id).style.borderColor = "var(--danger)";
    document.getElementById(id).style.backgroundColor = "#ffebee";
}

function removeHighlight(id) {
    document.getElementById(id).style.borderColor = "var(--border)";
    document.getElementById(id).style.backgroundColor = "white";
}

function exitGame2() {
    document.getElementById("game2-container").style.display = "none";
    document.getElementById("games-selection-view").style.display = "block";
}

function resetGame2UI() {
    inspectedCrates = 0;
    damagedBottlesTotal = 0;
    okBottlesTotal = 0;
    
    // Clear forms
    document.getElementById("g2-po-qty").value = "";
    document.getElementById("g2-do-qty").value = "";
    document.getElementById("g2-shortage-qty").value = "";
    document.getElementById("g2-damaged-qty").value = "";
    document.getElementById("g2-defect-rate").value = "";
    document.getElementById("g2-doc-type").value = "";
    document.getElementById("g2-action-plan").value = "";
    
    // Clear error highlights
    const fields = ["g2-po-qty", "g2-do-qty", "g2-shortage-qty", "g2-damaged-qty", "g2-defect-rate", "g2-doc-type", "g2-action-plan"];
    fields.forEach(f => removeHighlight(f));
}

// 6. Quiz Section
const quizQuestions = [
    {
        id: 1,
        question: "Apakah kesan buruk utama terhadap pengilang jika pembekal menghantar bekalan bahan mentah yang substandard (tidak berkualiti)?",
        options: [
            { key: "A", text: "Mempercepatkan kitaran masa pesanan (order cycle time) syarikat." },
            { key: "B", text: "Mengurangkan kos pengeluaran akibat lebihan bahan di lantai gudang." },
            { key: "C", text: "Mewujudkan pembaziran, mewujudkan keperluan stor tambahan, dan meningkatkan kos transaksi kertas kerja bagi membetulkan kesilapan." },
            { key: "D", text: "Meningkatkan kadar ketepatan pelabelan kod bar barangan secara automatik." }
        ],
        answer: "C"
    },
    {
        id: 2,
        question: "Antara berikut, manakah metrik rantaian bekalan yang wajib dimasukkan ke dalam Laporan Kualiti Perolehan untuk mengukur kebolehpercayaan masa dan kuantiti penghantaran pembekal secara serentak?",
        options: [
            { key: "A", text: "Defective Parts Per Million (PPM)" },
            { key: "B", text: "On-Time In-Full (OTIF) %" },
            { key: "C", text: "Direct Product Profitability (DPP)" },
            { key: "D", text: "Economic Order Quantity (EOQ)" }
        ],
        answer: "B"
    },
    {
        id: 3,
        question: "Semasa proses Pemeriksaan Penerimaan (Receiving Inspection), dokumen fizikal manakah yang perlu dipadankan bersama oleh pegawai gudang?",
        options: [
            { key: "A", text: "Goods Received Note (GRN) dan Invoice" },
            { key: "B", text: "Delivery Order (DO) dan Purchase Order (PO)" },
            { key: "C", text: "Non-Conformance Report (NCR) dan Credit Note" },
            { key: "D", text: "Request for Quotation (RFQ) dan Bill of Lading" }
        ],
        answer: "B"
    },
    {
        id: 4,
        question: "Apakah dokumen rasmi yang perlu dikeluarkan oleh Jabatan Perolehan kepada pembekal sekiranya kualiti barangan yang diterima gagal memenuhi spesifikasi atau standard kualiti organisasi?",
        options: [
            { key: "A", text: "Goods Received Note (GRN)" },
            { key: "B", text: "Delivery Order (DO)" },
            { key: "C", text: "Non-Conformance Report (NCR)" },
            { key: "D", text: "Purchase Order (PO)" }
        ],
        answer: "C"
    }
];

let activeQuestionIndex = 0;
let userAnswers = {};

function setupQuiz() {
    const nextBtn = document.getElementById("quiz-next-btn");
    const prevBtn = document.getElementById("quiz-prev-btn");
    const submitBtn = document.getElementById("quiz-submit-btn");

    if (nextBtn) nextBtn.addEventListener("click", nextQuestion);
    if (prevBtn) prevBtn.addEventListener("click", prevQuestion);
    if (submitBtn) submitBtn.addEventListener("click", gradeQuiz);
    
    // Auto-setup struct keyup evaluation
    const s1 = document.getElementById("quiz-struct1");
    const s2 = document.getElementById("quiz-struct2");
    if (s1 && s2) {
        [s1, s2].forEach(inp => inp.addEventListener("input", evaluateStructDraft));
    }
}

function startQuiz() {
    activeQuestionIndex = 0;
    userAnswers = {};
    
    if (studentProgress.quizCompleted) {
        showQuizResults();
    } else {
        document.getElementById("quiz-intro-card").style.display = "none";
        document.getElementById("quiz-play-view").style.display = "block";
        document.getElementById("quiz-results-view").style.display = "none";
        loadQuestion(0);
    }
}

function loadQuestion(idx) {
    activeQuestionIndex = idx;
    
    // Update progress bar
    const progress = ((idx) / (quizQuestions.length + 1)) * 100; // 4 MCQ + 1 Struct section
    document.getElementById("quiz-progress").style.width = `${progress}%`;
    
    // Hide all question cards
    const qContainer = document.getElementById("quiz-question-container");
    qContainer.innerHTML = "";
    
    if (idx < quizQuestions.length) {
        const q = quizQuestions[idx];
        const card = document.createElement("div");
        card.className = "quiz-question-card active";
        card.innerHTML = `
            <div style="font-size: 13px; color: var(--accent); font-weight: 700; margin-bottom: 8px;">SOALAN ${idx+1} DARI 5 (ANEKA PILIHAN)</div>
            <h3 style="font-size: 18px; line-height: 1.5; color: var(--primary-dark); margin-bottom: 20px;">${q.question}</h3>
            <div class="quiz-options">
                ${q.options.map(opt => `
                    <label class="quiz-option-label ${userAnswers[q.id] === opt.key ? 'selected' : ''}">
                        <input type="radio" name="quiz-q-${q.id}" value="${opt.key}" ${userAnswers[q.id] === opt.key ? 'checked' : ''} onchange="selectQuizOption(${q.id}, '${opt.key}')">
                        <span><strong>${opt.key}.</strong> ${opt.text}</span>
                    </label>
                `).join("")}
            </div>
        `;
        qContainer.appendChild(card);
        
        document.getElementById("quiz-next-btn").style.display = "inline-flex";
        document.getElementById("quiz-submit-btn").style.display = "none";
    } else {
        // Load Structural Section
        const card = document.createElement("div");
        card.className = "quiz-question-card active";
        card.innerHTML = `
            <div style="font-size: 13px; color: var(--accent); font-weight: 700; margin-bottom: 8px;">SOALAN 5 DARI 5 (SOALAN STRUKTUR)</div>
            <h3 style="font-size: 18px; color: var(--primary-dark); margin-bottom: 20px;">Bahagian B: Soalan Struktur & Pengaplikasian</h3>
            
            <div class="form-group" style="margin-bottom: 24px;">
                <label style="font-weight:600; font-size:14px; margin-bottom: 8px;">1. Nyatakan formula yang digunakan untuk mengira Kadar Kececatan (Defect Rate) di dalam Laporan Kualiti Perolehan:</label>
                <input type="text" id="quiz-struct1" class="form-input" placeholder="Tuliskan formula..." value="${userAnswers.struct1 || ''}" onchange="saveStructAnswer(1, this.value)">
                <div id="struct1-key-hint" style="font-size:12px; margin-top:6px; color: var(--text-light);">
                    Petunjuk: Pastikan formula mempunyai unsur 'rosak', 'diterima' dan '100%'.
                </div>
            </div>

            <div class="form-group">
                <label style="font-weight:600; font-size:14px; margin-bottom: 8px;">2. Jelaskan bagaimana kelemahan dalam menilai faktor "Kebergantungan (Dependability)" pembekal boleh menyebabkan kelumpuhan operasi sesebuah syarikat pembuatan. Berikan contoh sejarah rantaian bekalan dunia yang bersesuaian:</label>
                <textarea id="quiz-struct2" class="form-input form-textarea" placeholder="Huraikan jawapan anda..." onchange="saveStructAnswer(2, this.value)">${userAnswers.struct2 || ''}</textarea>
                <div id="struct2-key-hint" style="font-size:12px; margin-top:6px; color: var(--text-light);">
                    Petunjuk: Rujuk kes Toyota / Aisin Seiki (1997) di dalam nota.
                </div>
            </div>
        `;
        qContainer.appendChild(card);
        
        document.getElementById("quiz-next-btn").style.display = "none";
        document.getElementById("quiz-submit-btn").style.display = "inline-flex";
    }

    // Prev button visibility
    if (idx === 0) {
        document.getElementById("quiz-prev-btn").disabled = true;
    } else {
        document.getElementById("quiz-prev-btn").disabled = false;
    }
}

function selectQuizOption(qId, key) {
    userAnswers[qId] = key;
    
    // Visually toggle selected classes
    document.querySelectorAll(".quiz-option-label").forEach(lbl => {
        const checked = lbl.querySelector('input[type="radio"]').checked;
        if (checked) {
            lbl.classList.add("selected");
        } else {
            lbl.classList.remove("selected");
        }
    });
}

function saveStructAnswer(num, val) {
    if (num === 1) userAnswers.struct1 = val;
    if (num === 2) userAnswers.struct2 = val;
}

function evaluateStructDraft() {
    // real-time updating array structure
    userAnswers.struct1 = document.getElementById("quiz-struct1")?.value || "";
    userAnswers.struct2 = document.getElementById("quiz-struct2")?.value || "";
}

function nextQuestion() {
    if (activeQuestionIndex < quizQuestions.length) {
        // Ensure answered
        const currentQ = quizQuestions[activeQuestionIndex];
        if (!userAnswers[currentQ.id]) {
            showToast("Sila pilih satu jawapan sebelum meneruskan!", "error");
            return;
        }
        loadQuestion(activeQuestionIndex + 1);
    }
}

function prevQuestion() {
    if (activeQuestionIndex > 0) {
        loadQuestion(activeQuestionIndex - 1);
    }
}

function gradeQuiz() {
    // Validate struct questions are not empty
    const s1 = document.getElementById("quiz-struct1").value.trim();
    const s2 = document.getElementById("quiz-struct2").value.trim();
    
    if (!s1 || !s2) {
        showToast("Sila jawab semua soalan struktur terlebih dahulu!", "error");
        return;
    }
    
    userAnswers.struct1 = s1;
    userAnswers.struct2 = s2;

    let correctCount = 0;
    
    // Grade MCQs
    quizQuestions.forEach(q => {
        if (userAnswers[q.id] === q.answer) {
            correctCount++;
        }
    });

    // Grade Struct 1 (Formula)
    // Keywords check: "rosak" AND ("diterima" OR "jumlah")
    const s1Lower = s1.toLowerCase();
    const isS1Correct = s1Lower.includes("rosak") && (s1Lower.includes("diterima") || s1Lower.includes("total"));
    if (isS1Correct) correctCount++;

    // Grade Struct 2 (Toyota/Aisin Seiki dependability case)
    // Keywords: "toyota" AND ("aisin" OR "kebakaran" OR "tunggal" OR "brek")
    const s2Lower = s2.toLowerCase();
    const isS2Correct = s2Lower.includes("toyota") && (s2Lower.includes("aisin") || s2Lower.includes("bakar") || s2Lower.includes("tunggal") || s2Lower.includes("brek") || s2Lower.includes("seiki"));
    if (isS2Correct) correctCount++;

    // Calculate score (out of 6 total items: 4 MCQ + 2 Structs)
    const finalScorePct = Math.round((correctCount / 6) * 100);
    
    studentProgress.quizCompleted = true;
    studentProgress.quizScore = finalScorePct;
    studentProgress.quizAnswers = { ...userAnswers };
    saveProgress();
    
    showToast(`Kuiz selesai! Anda memperoleh markah ${finalScorePct}%`, "success");
    showQuizResults();
}

function showQuizResults() {
    document.getElementById("quiz-intro-card").style.display = "none";
    document.getElementById("quiz-play-view").style.display = "none";
    document.getElementById("quiz-results-view").style.display = "block";
    
    document.getElementById("quiz-final-score").textContent = `${studentProgress.quizScore}%`;
    
    const overallPct = studentProgress.quizScore;
    const desc = document.getElementById("quiz-result-desc");
    
    if (overallPct >= 80) {
        desc.innerHTML = `<span style="color: var(--success); font-weight: 700;">CEMERLANG!</span> Anda telah menguasai konsep Pengurusan Pembekal (Topik 4.0) dengan baik.`;
    } else if (overallPct >= 50) {
        desc.innerHTML = `<span style="color: var(--warning); font-weight: 700;">LULUS.</span> Baik, tetapi anda disyorkan untuk mengulang kaji nota bagi memperoleh markah maksimum.`;
    } else {
        desc.innerHTML = `<span style="color: var(--danger); font-weight: 700;">GAGAL.</span> Anda digalakkan untuk meneliti nota dan mencuba mini games semula bagi menguatkan kefahaman.`;
    }
}

function restartQuiz() {
    studentProgress.quizCompleted = false;
    studentProgress.quizScore = 0;
    studentProgress.quizAnswers = null;
    saveProgress();
    
    userAnswers = {};
    activeQuestionIndex = 0;
    
    document.getElementById("quiz-intro-card").style.display = "block";
    document.getElementById("quiz-play-view").style.display = "none";
    document.getElementById("quiz-results-view").style.display = "none";
}

function resetQuizUI() {
    userAnswers = {};
    activeQuestionIndex = 0;
    document.getElementById("quiz-intro-card").style.display = "block";
    document.getElementById("quiz-play-view").style.display = "none";
    document.getElementById("quiz-results-view").style.display = "none";
}

// 7. Lecturer Control Panel
let lecturerChartsInitialized = false;
let progressChart = null;
let marksChart = null;

function setupLecturerPanel() {
    // Add student form handler
    const addBtn = document.getElementById("add-student-btn");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            const nameInput = document.getElementById("new-student-name");
            const name = nameInput.value.trim();
            if (!name) {
                showToast("Sila masukkan nama pelajar!", "error");
                return;
            }
            
            // Generate random student progress
            const newStudent = {
                id: "S" + (mockStudents.length + 1).toString().padStart(3, '0'),
                name: name,
                notesRead: Math.random() > 0.5 ? ['s4-1', 's4-2', 's4-3', 's4-4', 's4-5'] : ['s4-1'],
                game1Completed: Math.random() > 0.4,
                game1Score: Math.random() > 0.4 ? 100 : 0,
                game2Completed: Math.random() > 0.5,
                game2Score: Math.random() > 0.5 ? 100 : 0,
                quizCompleted: Math.random() > 0.5,
                quizScore: Math.random() > 0.5 ? Math.floor(Math.random() * 40) + 60 : 0
            };
            
            mockStudents.push(newStudent);
            nameInput.value = "";
            updateLecturerTable();
            updateLecturerCharts();
            showToast(`Pelajar ${name} berjaya ditambahkan ke dalam sistem pemantauan.`, "success");
        });
    }

    // CSV Download handler
    const csvBtn = document.getElementById("download-csv-btn");
    if (csvBtn) {
        csvBtn.addEventListener("click", downloadLecturerCSV);
    }
}

function updateLecturerTable() {
    const tableBody = document.querySelector("#lecturer-table tbody");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    // Sort so active student is at top, or sort alphabetically
    mockStudents.forEach(student => {
        const notesPct = Math.round((student.notesRead.length / 5) * 100);
        const overall = calculateOverallProgress(student);
        
        let overallClass = "progress-pill low";
        if (overall >= 75) overallClass = "progress-pill high";
        else if (overall >= 40) overallClass = "progress-pill medium";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${student.name}</strong> ${student.id === "ACTIVE" ? '<span style="font-size:10px; background-color: var(--accent); color: var(--primary-dark); padding:2px 6px; border-radius:4px; margin-left:6px;">Anda</span>' : ''}</td>
            <td>${notesPct}% (${student.notesRead.length}/5)</td>
            <td>${student.game1Completed ? `<span style="color:var(--success); font-weight:600;"><i class="fas fa-check"></i> ${student.game1Score}/100</span>` : '<span style="color:var(--text-light);">-</span>'}</td>
            <td>${student.game2Completed ? `<span style="color:var(--success); font-weight:600;"><i class="fas fa-check"></i> ${student.game2Score}/100</span>` : '<span style="color:var(--text-light);">-</span>'}</td>
            <td>${student.quizCompleted ? `<strong>${student.quizScore}%</strong>` : '<span style="color:var(--text-light);">-</span>'}</td>
            <td><span class="${overallClass}">${overall}%</span></td>
            <td>
                <div class="action-links">
                    <button class="action-link-btn view" onclick="viewStudentDetails('${student.id || student.name}')"><i class="fas fa-eye"></i> Periksa</button>
                    <button class="action-link-btn reset" onclick="resetStudentProgress('${student.id || student.name}')"><i class="fas fa-undo"></i> Reset</button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Update Summary Stats Card on Lecturer tab
    const totalStudents = mockStudents.length;
    let sumOverall = 0;
    let completedCount = 0;
    
    mockStudents.forEach(s => {
        const ovr = calculateOverallProgress(s);
        sumOverall += ovr;
        if (ovr === 100) completedCount++;
    });
    
    const avgOverall = totalStudents > 0 ? Math.round(sumOverall / totalStudents) : 0;
    
    document.getElementById("lect-stat-count").textContent = totalStudents;
    document.getElementById("lect-stat-avg").textContent = `${avgOverall}%`;
    document.getElementById("lect-stat-completed").textContent = `${completedCount} Pelajar`;
}

function viewStudentDetails(studentId) {
    const student = mockStudents.find(s => s.id === studentId || s.name === studentId);
    if (!student) return;

    const modal = document.getElementById("student-details-modal");
    const container = document.getElementById("modal-student-data");
    
    const overall = calculateOverallProgress(student);
    
    let quizDetails = "";
    if (student.quizCompleted) {
        quizDetails = `
            <div style="background-color: var(--bg-main); padding: 12px; border-radius: var(--radius-sm); margin-top: 10px;">
                <p><strong>Markah Kuiz:</strong> ${student.quizScore}%</p>
                <p><strong>Jawapan MCQ:</strong></p>
                <ul style="margin-left: 20px; font-size:12px;">
                    <li>S1 (Definisi/Kesan Substandard): ${student.quizAnswers?.["1"] || "C"}</li>
                    <li>S2 (Metrik OTIF): ${student.quizAnswers?.["2"] || "B"}</li>
                    <li>S3 (Padanan DO/PO): ${student.quizAnswers?.["3"] || "B"}</li>
                    <li>S4 (Sebab NCR): ${student.quizAnswers?.["4"] || "C"}</li>
                </ul>
                <p style="margin-top: 8px;"><strong>Jawapan Struktur:</strong></p>
                <div style="background:white; border:1px solid var(--border); padding:8px; border-radius:4px; font-size:11px; margin-bottom: 6px;">
                    <strong>Formula Defect Rate:</strong> ${student.quizAnswers?.struct1 || "Kadar Kecacatan = (Jumlah Unit Rosak / Jumlah Diterima) * 100%"}
                </div>
                <div style="background:white; border:1px solid var(--border); padding:8px; border-radius:4px; font-size:11px;">
                    <strong>Huraian Kebergantungan:</strong> ${student.quizAnswers?.struct2 || "Toyota terpaksa tutup kilang seminggu sebab kilang brek tunggal Aisin Seiki terbakar."}
                </div>
            </div>
        `;
    } else {
        quizDetails = `<p style="color:var(--text-light); font-style:italic;">Belum menjawab kuiz.</p>`;
    }

    let game2Details = "";
    if (student.game2Completed) {
        game2Details = `
            <div style="background-color: var(--bg-main); padding: 12px; border-radius: var(--radius-sm); margin-top: 10px;">
                <p><strong>Status Game 2 (Audit Gudang):</strong> Lulus (Kadar Kecacatan: 16.67%)</p>
                <p><strong>Laporan GRN/NCR yang Disediakan:</strong></p>
                <ul style="margin-left: 20px; font-size:12px;">
                    <li>PO: 1000 unit | DO: 900 unit | Shortage: 100 unit</li>
                    <li>Rosak: 150 unit | Kadar Kecacatan: 16.67%</li>
                    <li>Tindakan: Keluar GRN & NCR untuk pemulangan dan gantian.</li>
                </ul>
            </div>
        `;
    } else {
        game2Details = `<p style="color:var(--text-light); font-style:italic;">Belum menyelesaikan audit gudang.</p>`;
    }

    container.innerHTML = `
        <h3 style="font-size:22px; color:var(--primary-dark); margin-bottom:12px;">Laporan Prestasi Pelajar</h3>
        <p><strong>Nama Pelajar:</strong> ${student.name}</p>
        <p><strong>ID Pelajar:</strong> ${student.id}</p>
        <p><strong>Kemajuan Keseluruhan:</strong> ${overall}%</p>
        <div style="margin: 16px 0; border-top: 1px solid var(--border); padding-top: 12px;">
            <h4 style="margin-bottom:6px; font-size:14px; color:var(--primary);">Status Pembacaan Nota:</h4>
            <p>${student.notesRead.length} daripada 5 subtopik dibaca (${Math.round((student.notesRead.length/5)*100)}%)</p>
        </div>
        <div style="margin: 16px 0;">
            <h4 style="margin-bottom:6px; font-size:14px; color:var(--primary);">Pencapaian Permainan 1 (Matriks Pemberat):</h4>
            <p>${student.game1Completed ? `Selesai dengan Skor: <strong>${student.game1Score}/100</strong>` : '<span style="color:var(--text-light);">Belum Selesai</span>'}</p>
        </div>
        <div style="margin: 16px 0;">
            <h4 style="margin-bottom:6px; font-size:14px; color:var(--primary);">Pencapaian Permainan 2 (Audit Gudang):</h4>
            ${game2Details}
        </div>
        <div style="margin: 16px 0;">
            <h4 style="margin-bottom:6px; font-size:14px; color:var(--primary);">Butiran Jawapan Kuiz:</h4>
            ${quizDetails}
        </div>
    `;

    modal.style.display = "flex";
}

function closeStudentModal() {
    document.getElementById("student-details-modal").style.display = "none";
}

function resetStudentProgress(studentId) {
    const student = mockStudents.find(s => s.id === studentId || s.name === studentId);
    if (!student) return;

    if (confirm(`Adakah anda pasti mahu menyet semula semua kemajuan bagi pelajar ${student.name}?`)) {
        if (student.id === "ACTIVE") {
            // Also reset active student progress
            studentProgress = {
                name: "Ahmad Faiz bin Roslan",
                notesRead: [],
                game1Completed: false,
                game1Score: 0,
                game2Completed: false,
                game2Score: 0,
                quizCompleted: false,
                quizScore: 0,
                quizAnswers: null,
                game2Report: null
            };
            localStorage.setItem("procurement_student_progress", JSON.stringify(studentProgress));
            resetGame1UI();
            resetGame2UI();
            resetQuizUI();
            updateUI();
        }

        student.notesRead = [];
        student.game1Completed = false;
        student.game1Score = 0;
        student.game2Completed = false;
        student.game2Score = 0;
        student.quizCompleted = false;
        student.quizScore = 0;
        student.quizAnswers = null;
        
        updateLecturerTable();
        updateLecturerCharts();
        showToast(`Kemajuan pelajar ${student.name} telah diset semula.`, "warning");
    }
}

function updateLecturerCharts() {
    if (typeof Chart === "undefined") return;

    // Data lists
    const names = mockStudents.map(s => s.name.split(" ")[0]); // Use first names for brevity
    const progresses = mockStudents.map(s => calculateOverallProgress(s));
    const quizScores = mockStudents.map(s => s.quizCompleted ? s.quizScore : 0);

    const ctxProgress = document.getElementById("chart-progress");
    const ctxScores = document.getElementById("chart-quiz");

    if (!ctxProgress || !ctxScores) return;

    if (progressChart) progressChart.destroy();
    if (marksChart) marksChart.destroy();

    // Chart 1: Progress Chart
    progressChart = new Chart(ctxProgress, {
        type: 'bar',
        data: {
            labels: names,
            datasets: [{
                label: 'Kemajuan (%)',
                data: progresses,
                backgroundColor: 'rgba(128, 0, 0, 0.75)',
                borderColor: 'rgba(128, 0, 0, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#6e6e6e'
                    }
                },
                x: {
                    ticks: {
                        color: '#6e6e6e'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Chart 2: Quiz Marks Chart
    marksChart = new Chart(ctxScores, {
        type: 'bar',
        data: {
            labels: names,
            datasets: [{
                label: 'Markah Kuiz (%)',
                data: quizScores,
                backgroundColor: 'rgba(212, 175, 55, 0.8)',
                borderColor: 'rgba(212, 175, 55, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#6e6e6e'
                    }
                },
                x: {
                    ticks: {
                        color: '#6e6e6e'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function downloadLecturerCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID Pelajar,Nama Pelajar,Nota Dibaca,Game 1 Score,Game 2 Score,Quiz Score,Kemajuan Keseluruhan (%)\n";
    
    mockStudents.forEach(s => {
        const row = [
            s.id,
            `"${s.name}"`,
            `${s.notesRead.length}/5`,
            s.game1Score,
            s.game2Score,
            s.quizCompleted ? `${s.quizScore}%` : "Belum Jawab",
            `${calculateOverallProgress(s)}%`
        ].join(",");
        csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Laporan_Kemajuan_Pelajar_SLK30183.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Laporan CSV berjaya dimuat turun!", "success");
}

// 8. PDF Download Notes Logic
function downloadNotesPDF() {
    showToast("Menyediakan dokumen PDF untuk dimuat turun...", "warning");
    
    // Create new print window
    const printWindow = window.open('', '_blank');
    
    // Retrieve HTML contents of note sections
    const getHTML = (id) => {
        const el = document.getElementById(id);
        return el ? el.innerHTML : '';
    };

    const notesHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>SLK30183 Pengurusan Perolehan dan Sumber - Topik 4.0: Pengurusan Pembekal</title>
            <style>
                body {
                    font-family: 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    padding: 40px;
                }
                h1, h2, h3, h4 {
                    color: #800000;
                }
                h1 {
                    border-bottom: 3px solid #d4af37;
                    padding-bottom: 10px;
                    font-size: 28px;
                    text-align: center;
                }
                h2 {
                    margin-top: 30px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 6px;
                }
                .school-title {
                    text-align: center;
                    font-size: 14px;
                    color: #6e6e6e;
                    margin-top: -10px;
                    margin-bottom: 30px;
                }
                .accent-box {
                    background-color: #f5efeb;
                    border-left: 4px solid #800000;
                    padding: 15px;
                    margin: 20px 0;
                }
                .factor-card {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 12px;
                }
                .factor-num {
                    font-weight: bold;
                    color: #d4af37;
                }
                .factor-title {
                    font-weight: bold;
                    color: #800000;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px 12px;
                    text-align: left;
                }
                th {
                    background-color: #800000;
                    color: white;
                }
                .page-break {
                    page-break-after: always;
                }
            </style>
        </head>
        <body>
            <h1>SLK30183 PENGURUSAN PEROLEHAN DAN SUMBER</h1>
            <div class="school-title">Kolej Komuniti Papar | Unit Sijil Perkhidmatan Logistik</div>
            
            <div class="page-break">
                <h2>TOPIK 4.0: PENGURUSAN PEMBEKAL</h2>
                <p>Pengurusan pembekal merupakan aspek kritikal dalam pengurusan rantaian bekalan moden. Keupayaan sesebuah perniagaan untuk merancang, memilih, menilai, dan bekerjasama melalui hubungan strategik dengan pihak pembekal akan menentukan tahap kualiti produk akhir, kecekapan kos, dan kelancaran operasi perniagaan secara keseluruhan.</p>
                
                <h3>4.1 Definisi dan Kepentingan Pembekal kepada Peniaga</h3>
                <p><strong>Definisi Pembekal:</strong> Pembekal ialah rakan kongsi huluan (upstream partners) dalam rantaian bekalan, yang boleh terdiri daripada individu, syarikat, atau institusi, yang bertanggungjawab membekalkan bahan mentah, komponen, barangan siap, utiliti (seperti air dan elektrik), bahan harian (seperti alat tulis), aset modal (seperti mesin dan kenderaan), mahupun perkhidmatan luaran (seperti kontrak pengedaran dan IT) kepada sesebuah organisasi perniagaan.</p>
                
                <p><strong>Kepentingan Pembekal kepada Peniaga:</strong></p>
                <ul>
                    <li><strong>Jaminan Bekalan Berterusan:</strong> Mengelakkan gangguan kilang terhenti (plant stoppages/downtime) yang mahal.</li>
                    <li><strong>Kecekapan & Kelebihan Kos Organisasi:</strong> Kos bahan mentah boleh mencecah sehingga 85% daripada kos produk siap. Pengurangan kos pembekal memberi leverage margin untung yang tinggi.</li>
                    <li><strong>Kawalan Kualiti Produk Akhir:</strong> Kualiti input pembekal menentukan mutu produk akhir, mengurangkan kos sisa buangan, kerja semula dan tuntutan pelanggan.</li>
                    <li><strong>Peluang Inovasi, Daya Saing & Kelebihan Daya Saing (Competitive Advantage):</strong> Rakan pembekal menyumbang teknologi terkini, integrasi JIT dan perkongsian maklumat masa nyata.</li>
                </ul>
            </div>
            
            <div class="page-break">
                <h3>4.2 Faktor Penilaian Pembekal</h3>
                <p>Sebelum melantik pembekal, organisasi perlu menilai keupayaan mereka secara sistematik berdasarkan 10 faktor utama:</p>
                
                <div class="factor-card">
                    <span class="factor-num">4.2.1</span> <span class="factor-title">Teknologi berkaitan proses dan produk:</span>
                    <p>Mengukur automasi pembuatan dan spesifikasi teknikal. Penglibatan Awal Pembekal (Early Supplier Involvement - ESI) membantu mengenal pasti isu reka bentuk.</p>
                </div>
                <div class="factor-card">
                    <span class="factor-num">4.2.2</span> <span class="factor-title">Ketersediaan berkongsi teknologi & maklumat:</span>
                    <p>Sikap telus terhadap data inventori, demand forecast dan jualan masa nyata. EDI (Electronic Data Interchange) membantu mengurangkan Bullwhip Effect.</p>
                </div>
                <div class="factor-card">
                    <span class="factor-num">4.2.3</span> <span class="factor-title">Kualiti:</span>
                    <p>Konsistensi barangan, pematuhan ISO, meminimumkan defect rate.</p>
                </div>
                <div class="factor-card">
                    <span class="factor-num">4.2.4</span> <span class="factor-title">Kos/Harga:</span>
                    <p>Total Cost of Ownership (TCO), kestabilan harga, terma kredit fleksibel.</p>
                </div>
                <div class="factor-card">
                    <span class="factor-num">4.2.5</span> <span class="factor-title">Kebergantungan (Reliability/Dependability):</span>
                    <p>Ketepatan masa (on-time), kestabilan kewangan. Pergantungan tunggal (single supplier) berisiko tinggi (Cth: Kebakaran Aisin Seiki 1997 menjejaskan Toyota).</p>
                </div>
                <div class="factor-card">
                    <span class="factor-num">4.2.6</span> <span class="factor-title">Sistem pesanan & kitaran masa (Lead Time):</span>
                    <p>Kecekapan memproses pesanan dan tempoh kitaran pesanan.</p>
                </div>
                <div class="factor-card">
                    <span class="factor-num">4.2.7</span> <span class="factor-title">Kapasiti:</span>
                    <p>Had pengeluaran pembekal bagi menampung lonjakan permintaan bermusim.</p>
                </div>
                <div class="factor-card">
                    <span class="factor-num">4.2.8</span> <span class="factor-title">Keupayaan komunikasi:</span>
                    <p>Kemudahan menghubungi dan sistem pengesanan status pesanan (track and trace).</p>
                </div>
                <div class="factor-card">
                    <span class="factor-num">4.2.9</span> <span class="factor-title">Lokasi:</span>
                    <p>Jarak geografi yang mempengaruhi kos pengangkutan, lead time dan kastam.</p>
                </div>
                <div class="factor-card">
                    <span class="factor-num">4.2.10</span> <span class="factor-title">Tahap Perkhidmatan (Service Level):</span>
                    <p>Inventory availability, OTIF (On-Time In-Full), waranti dan polisi pulangan.</p>
                </div>
            </div>

            <div class="page-break">
                <h3>4.3 Kaedah Penilaian Pembekal</h3>
                <p>Organisasi menggunakan kaedah berstruktur dan kuantitatif bagi memastikan pemilihan adil, telus, dan objektif:</p>
                <h4>4.3.1 Kaedah Evaluation Criteria (MCDM / AHP)</h4>
                <p>Menggunakan Model Keputusan Pelbagai Kriteria (MCDM) seperti Analytic Hierarchy Process (AHP) untuk mengimbangi kriteria wajib (must-haves), kriteria penting (should-haves) dan kriteria tambahan (nice-to-haves).</p>
                
                <h4>4.3.2 Kaedah Pemberat (Measuring Suppliers Weighted Method)</h4>
                <p>Langkah-langkah:</p>
                <ol>
                    <li>Tentukan kriteria penilaian (cth: Kualiti, Harga, OTIF).</li>
                    <li>Berikan wajaran (W) (jumlah wajaran = 1.00 atau 100%).</li>
                    <li>Berikan skor prestasi (S) (skala 1-5).</li>
                    <li>Hitung Skor Terpemberat (Wajaran x Skor).</li>
                    <li>Jumlahkan skor untuk mendapatkan Skor Akhir: <strong>Skor Akhir = Sum(Wajaran x Skor)</strong>.</li>
                </ol>
            </div>

            <div>
                <h3>4.4 Melaporkan Kuantiti dan Kualiti Barang</h3>
                <p>Setiap barangan yang masuk wajib melalui <strong>Pemeriksaan Penerimaan (Receiving Inspection)</strong>.</p>
                <ul>
                    <li><strong>Pemeriksaan:</strong> Padankan Delivery Order (DO) dengan Purchase Order (PO) asal.</li>
                    <li><strong>Kuantiti:</strong> Mengesan shortage / over-delivery. Perbezaan direkod dalam <strong>Nota Penerimaan Barang (Goods Received Note - GRN)</strong>. Kuantiti diukur melalui metrik Order Fill Rate.</li>
                    <li><strong>Kualiti:</strong> Pemeriksaan visual berdasarkan AQL (Acceptable Quality Limit). Sekiranya gagal, keluarkan <strong>Laporan Barangan Tidak Akur (Non-Conformance Report - NCR)</strong>. Kualiti diukur melalui PPM (Defective parts per million) atau kadar pemulangan (returns).</li>
                </ul>

                <h3>4.5 Laporan Kualiti Perolehan</h3>
                <p>Dokumen rasmi (measurement dashboard) prestasi keseluruhan perolehan dan pembekal:</p>
                <div class="accent-box">
                    <strong>Formula Kadar Kecacatan (Defect Rate):</strong><br>
                    Defect Rate = (Jumlah Unit Rosak / Jumlah Unit Diterima) x 100%
                </div>
                <p>Komponen Utama Dashboards:</p>
                <ul>
                    <li>Supplier OTIF (On-Time In-Full) %</li>
                    <li>Kadar Kecacatan Bekalan %</li>
                    <li>Kadar Ralat Invois (Invoice Error) %</li>
                    <li>Kadar Pemulangan Barang (Returns/Claims) %</li>
                    <li>Indeks Pemenuhan Pesanan Bersepadu (Order Fulfillment Score)</li>
                </ul>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(notesHTML);
    printWindow.document.close();
    
    // Wait for content load then print
    printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
        showToast("Fail PDF telah dijana!", "success");
    };
}

// 9. Portal Log Masuk & Separasi Peranan
function switchLoginTab(role) {
    document.querySelectorAll(".login-tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".login-form-body").forEach(form => form.classList.remove("active"));
    
    if (role === "student") {
        document.getElementById("login-tab-student").classList.add("active");
        document.getElementById("student-login-form").classList.add("active");
    } else {
        document.getElementById("login-tab-lecturer").classList.add("active");
        document.getElementById("lecturer-login-form").classList.add("active");
    }
}

function handleStudentLogin() {
    const nameInput = document.getElementById("student-name-input").value.trim();
    const idInput = document.getElementById("student-id-input").value.trim();
    
    if (!nameInput || !idInput) {
        showToast("Sila masukkan Nama Penuh dan No. Pendaftaran anda!", "error");
        return;
    }
    
    userRole = "student";
    studentId = idInput;
    
    // Set studentProgress name and id
    studentProgress.name = nameInput;
    studentProgress.id = idInput;
    
    // Check if progress already exists in localStorage for this student name
    const savedProgressKey = `procurement_progress_${nameInput.toLowerCase().replace(/\s+/g, '_')}`;
    const saved = localStorage.getItem(savedProgressKey);
    if (saved) {
        try {
            studentProgress = JSON.parse(saved);
        } catch (e) {
            console.error("Error parsing progress", e);
        }
    } else {
        // Reset progress for new student session
        studentProgress.notesRead = [];
        studentProgress.game1Completed = false;
        studentProgress.game1Score = 0;
        studentProgress.game2Completed = false;
        studentProgress.game2Score = 0;
        studentProgress.quizCompleted = false;
        studentProgress.quizScore = 0;
        studentProgress.quizAnswers = null;
        studentProgress.game2Report = null;
    }
    
    // Save current active student progress
    localStorage.setItem("procurement_active_student_key", savedProgressKey);
    saveProgress();
    
    // Save session role
    sessionStorage.setItem("user_role", "student");
    sessionStorage.setItem("student_name", nameInput);
    sessionStorage.setItem("student_id", idInput);
    
    // Update Badge & UI
    document.getElementById("badge-student-name").textContent = nameInput;
    document.getElementById("header-progress-badge").style.display = "flex";
    
    // Update UI elements
    updateUI();
    
    // Setup tabs for student
    setupRoleUI("student");
    
    // Transition views
    document.getElementById("login-container").classList.add("hidden");
    document.getElementById("app-container").classList.remove("hidden");
    
    showToast(`Selamat datang, ${nameInput}!`, "success");
    switchTab("utama");
}

function handleLecturerLogin() {
    const passwordInput = document.getElementById("lecturer-password-input").value;
    
    if (passwordInput === "pensyarah123") {
        userRole = "lecturer";
        
        sessionStorage.setItem("user_role", "lecturer");
        
        // Hide badge in header since lecturer has no personal progress
        document.getElementById("header-progress-badge").style.display = "none";
        
        // Setup tabs for lecturer
        setupRoleUI("lecturer");
        
        // Transition views
        document.getElementById("login-container").classList.add("hidden");
        document.getElementById("app-container").classList.remove("hidden");
        
        showToast("Log masuk pensyarah berjaya!", "success");
        
        // Go straight to lecturer tab
        switchTab("pensyarah");
        
        // Load table & charts
        updateLecturerTable();
        updateLecturerCharts();
    } else {
        showToast("Kata laluan salah! Sila cuba lagi.", "error");
    }
}

function setupRoleUI(role) {
    const allTabs = document.querySelectorAll(".nav-tabs .tab-btn");
    allTabs.forEach(tab => {
        const tabName = tab.getAttribute("data-tab");
        if (role === "student") {
            if (tabName === "pensyarah") {
                tab.style.display = "none";
            } else {
                tab.style.display = "inline-flex";
            }
        } else if (role === "lecturer") {
            if (tabName === "pensyarah") {
                tab.style.display = "inline-flex";
            } else {
                tab.style.display = "none";
            }
        }
    });
}

function handleLogout() {
    sessionStorage.clear();
    userRole = "guest";
    
    // Reset login inputs
    document.getElementById("student-name-input").value = "";
    document.getElementById("student-id-input").value = "";
    document.getElementById("lecturer-password-input").value = "";
    
    // Transition views
    document.getElementById("app-container").classList.add("hidden");
    document.getElementById("login-container").classList.remove("hidden");
    
    showToast("Anda telah berjaya log keluar.", "info");
}
