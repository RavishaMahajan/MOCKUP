document.getElementById('box1').addEventListener('click', () => {
  const popup = document.getElementById('popup');
  popup.style.display = 'block';

  const ctx = document.getElementById('barChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Temperature', 'Humidity', 'Battery'],
      datasets: [{
        label: 'Box 1 Data',
        data: [27, 68, 85],
        backgroundColor: ['#58a6ff', '#76c7c0', '#ffd700']
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
});

document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('popup').style.display = 'none';
});

window.onclick = function(event) {
  const popup = document.getElementById('popup');
  if (event.target == popup) {
    popup.style.display = 'none';
  }
};
