// switch pages
function showScreen(screenId) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".controls button")
    .forEach((b) => b.classList.remove("active"));

  document.getElementById(screenId).classList.add("active");
  document.getElementById("btn-" + screenId).classList.add("active");
}

// carousel auto play
let index = 0;
const images = document.querySelectorAll(".carousel-slide");

function autoCarousel() {
  // remove 'active' classname
  images[index].classList.remove("active");

  // move to next
  index++;
  if (index >= images.length) {
    index = 0;
  }
  images[index].classList.add("active");
}

// auto switch per 3 seconds
setInterval(autoCarousel, 3000);
