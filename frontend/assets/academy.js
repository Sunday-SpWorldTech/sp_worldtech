const service_BASE = window.APP_CONFIG.service_BASE_URL;
const iconFallback = ['🌐','🎨','⚡','🧭','⚛️','🟢','🍃','🐍','🏗️','🧠','💠','🤖'];
async function loadAcademyCourses(){
  const grid = document.getElementById('academyCourseGrid'); if(!grid) return;
  grid.innerHTML = '<div class="mini-card">Loading courses...</div>';
  try{
    const res = await fetch(`${service_BASE}/academy/courses`);
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_error) { throw new Error(`Platform returned non-JSON response: ${text.slice(0,80) || res.statusText}`); }
    if (!res.ok) throw new Error(data.message || 'Academy service request failed');
    grid.innerHTML = (data.courses||[]).map((course,i)=>{
      const page = course.page || `academy-course.html?course=${encodeURIComponent(course.id)}`;
      return `<a class="info-card academy-course-card course-link-card" href="./${page}"><div class="course-icon">${course.icon||iconFallback[i%iconFallback.length]}</div><h3>${course.title}</h3><p>${course.skill}</p><div class="job-meta">${course.level} · ${course.lessons} lessons</div><span class="primary plain-anchor-btn">Open Course</span></a>`;
    }).join('') || '<div class="mini-card">No courses found.</div>';
  }catch(error){ grid.innerHTML = `<div class="mini-card">${error.message}</div>`; }
}
document.addEventListener('DOMContentLoaded', loadAcademyCourses);
