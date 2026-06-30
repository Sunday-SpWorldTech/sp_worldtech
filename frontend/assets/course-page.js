const service_BASE = window.APP_CONFIG.service_BASE_URL;
function esc(v=''){return String(v).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
const pageName = location.pathname.split('/').pop();
async function loadCoursePage(){
  const wrap = document.getElementById('coursePageApp'); if(!wrap) return;
  try{
    const res = await fetch(`${service_BASE}/academy/courses`);
    const data = await res.json();
    const courses = data.courses || [];
    const params = new URLSearchParams(location.search);
    const course = courses.find(c => c.page === pageName || c.id === params.get('course')) || courses[0];
    if(!course) throw new Error('Course not found');
    document.title = `${course.title} | SP WorldTech Academy`;
    wrap.innerHTML = `<section class="inner-hero academy-course-hero"><div class="container inner-hero-content"><span class="eyebrow">${esc(course.level)} Course</span><h1><span class="course-hero-icon">${course.icon}</span> ${esc(course.title)}</h1><p>${esc(course.skill)}. This course opens on its own dedicated page for clean desktop and mobile learning.</p><div class="hero-actions"><a class="primary large plain-anchor-btn" href="./dashboard.html#academy-panel">Track Progress</a><a class="secondary large plain-anchor-btn" href="./academy.html">All Courses</a></div></div></section><section class="content-section light"><div class="container course-page-grid"><article class="feature-panel soft-panel"><h2>Course roadmap</h2><p>${esc(course.lessons)} lessons with assignments, quiz practice and final project review.</p><ol class="lesson-list">${(course.topics||[]).map((topic,i)=>`<li><strong>Lesson ${i+1}:</strong> ${esc(topic)}</li>`).join('')}</ol></article><article class="feature-panel ai-tutor-box"><h2>Google AI Studio Tutor</h2><p>Ask for lesson help, quiz practice, assignment guidance or project ideas. The platform uses Gemini/Google AI Studio env key and safely handles free-tier limits.</p><form id="courseTutorForm" class="product-application-form"><input name="topic" placeholder="Topic or question" required /><select name="promptType"><option value="lesson">Generate Lesson</option><option value="quiz">Generate Quiz</option><option value="assignment">Generate Assignment</option><option value="project">Generate Project Guide</option></select><button class="primary" type="submit">Ask AI Tutor</button></form><pre id="courseTutorOutput" class="ai-output">AI tutor output will appear here.</pre></article></div></section>`;
    document.getElementById('courseTutorForm')?.addEventListener('submit', async (event)=>{
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      const out = document.getElementById('courseTutorOutput');
      out.textContent = 'Generating with academy tutor...';
      try{
        const token = localStorage.getItem('spworldtech_user_token') || localStorage.getItem('spworldtech_token') || localStorage.getItem('token') || '';
        const r = await fetch(`${service_BASE}/academy/tutor`, {method:'POST', headers:{'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})}, body:JSON.stringify({courseId:course.id, topic:fd.get('topic'), promptType:fd.get('promptType')})});
        const d = await r.json();
        if(!r.ok) throw new Error(d.message || 'AI tutor unavailable');
        out.textContent = d.content || 'No response returned.';
      }catch(err){ out.textContent = err.message; }
    });
  }catch(err){ wrap.innerHTML = `<section class="content-section"><div class="container"><div class="mini-card">${esc(err.message)}</div></div></section>`; }
}
document.addEventListener('DOMContentLoaded', loadCoursePage);
