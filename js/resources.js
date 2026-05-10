const resourceGrid =
  document.getElementById("resourceGrid");

const searchInput =
  document.getElementById("searchInput");

let resourcesData = [];

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

      <a href="${resource.link}">
        View Resource
      </a>

    `;

    resourceGrid.appendChild(card);

  });

}

fetch("../data/resources.json")

  .then(response => response.json())

  .then(data => {

    resourcesData = data;

    displayResources(resourcesData);

  });

searchInput.addEventListener("input", () => {

  const keyword =
    searchInput.value.toLowerCase();

  const filteredResources =
    resourcesData.filter(resource => {

      return (

        resource.title
          .toLowerCase()
          .includes(keyword)

        ||

        resource.category
          .toLowerCase()
          .includes(keyword)

        ||

        resource.description
          .toLowerCase()
          .includes(keyword)

      );

    });

  displayResources(filteredResources);

});