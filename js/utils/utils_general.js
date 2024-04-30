/**
 * Author: Danny Rakita
 * Description: For CPSC-487-587 3D Spatial Modeling and Computing at Yale University
 */
export function print_var_to_document(v, prefix="") {
    let newDiv = document.createElement("div");
    newDiv.innerHTML = prefix + v;
    document.body.appendChild(newDiv);
}