const resourceGrid =
  document.getElementById("resourceGrid");

fetch("../data/resources.json")

  .then(response => response.json())

  .then(data => {

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

  });