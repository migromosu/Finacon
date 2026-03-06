const boton = document.getElementById("botonSaludo");
const mensaje = document.getElementById("mensaje");

boton.addEventListener("click", function () {
  mensaje.textContent = "Funciona. Ya has creado una mini app dentro de GitHub.";
});
