let resources = [];

const resourceGrid = document.getElementById(
  "resourceGrid"
);

const filterButtons = document.querySelectorAll(
  ".category-filter button"
);

const searchInput = document.getElementById(
  "searchInput"
);

async function loadResources() {

  const response = await fetch(
    "../data/resources.json"
  );

  resources = await response.json();
  const localResources = JSON.parse(
  localStorage.getItem("resources")
  ) || [];

resources = [...resources, ...localResources];

  displayResources(resources);

}

function displayResources(data) {

  resourceGrid.innerHTML = "";

  data.forEach(resource => {

    const card = document.createElement("div");

    card.classList.add("resource-card");

    card.innerHTML = `
    
      <div class="resource-top">

        <span class="resource-category">
          ${resource.category}
        </span>

      </div>

      <h3>${resource.title}</h3>

      <p>${resource.description}</p>

      <a 
        href="${resource.link}" 
        target="_blank"
        rel="noopener noreferrer"
      >
        View Resource
      </a>

    `;

    resourceGrid.appendChild(card);

  });

}

filterButtons.forEach(button => {

  button.addEventListener("click", () => {

    document
      .querySelector(".category-filter .active")
      .classList.remove("active");

    button.classList.add("active");

    const category = button.dataset.category;

    if (category === "All") {

      displayResources(resources);

    } else {

      const filtered = resources.filter(resource =>
        resource.category === category
      );

      displayResources(filtered);

    }

  });

});

searchInput.addEventListener("keyup", () => {

  const keyword = searchInput.value.toLowerCase();

  const filtered = resources.filter(resource =>

    resource.title.toLowerCase().includes(keyword) ||

    resource.description.toLowerCase().includes(keyword) ||

    resource.category.toLowerCase().includes(keyword)

  );

  displayResources(filtered);

});

loadResources();