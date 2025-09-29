    document.getElementById("themeToggle").addEventListener("click", () => {
      document.documentElement.classList.toggle("dark");

      if (document.documentElement.classList.contains("dark")) {
        localStorage.setItem("theme", "dark");
      } else {
        localStorage.setItem("theme", "light");
      }
    });

    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }

    // Gestion du champ tome personnalisé
    document.getElementById("volume").addEventListener("change", function() {
      const customVolumeField = document.getElementById("customVolume");
      if (this.value === "autre") {
        customVolumeField.style.display = "block";
        customVolumeField.required = true;
      } else {
        customVolumeField.style.display = "none";
        customVolumeField.required = false;
        customVolumeField.value = "";
      }
    });