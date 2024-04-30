/**
 * Author: Danny Rakita
 * Description: For CPSC-487-587 3D Spatial Modeling and Computing at Yale University
 */

// matrices should be an array of arrays in row-major format
// [
// [m00, m01, ..., m0n],
// [m10, m11, ..., m1n],
// ...
// [mm0, mm1, ..., mmn]
// ]
export function add_matrix_matrix(m1, m2) {
    let mm1 = roll_list_into_column_vec_matrix(m1);
    let mm2 = roll_list_into_column_vec_matrix(m2);

    if (mm1.length !== mm2.length || mm1[0].length !== mm2[0].length) {
        throw new Error("Matrices dimensions must be the same.");
    }

    let result = new Array(mm1.length);
    for (let i = 0; i < mm1.length; i++) {
        result[i] = new Array(mm1[i].length);
        for (let j = 0; j < mm1[i].length; j++) {
            result[i][j] = mm1[i][j] + mm2[i][j];
        }
    }
    return result;
}

// matrices should be an array of arrays in row-major format
// [
// [m00, m01, ..., m0n],
// [m10, m11, ..., m1n],
// ...
// [mm0, mm1, ..., mmn]
// ]
export function sub_matrix_matrix(m1, m2) {
    m1 = roll_list_into_column_vec_matrix(m1);
    m2 = roll_list_into_column_vec_matrix(m2);

    if (m1.length !== m2.length || m1[0].length !== m2[0].length) {
        throw new Error("Matrices dimensions must be the same.");
    }

    let result = new Array(m1.length);
    for (let i = 0; i < m1.length; i++) {
        result[i] = new Array(m1[i].length);
        for (let j = 0; j < m1[i].length; j++) {
            result[i][j] = m1[i][j] - m2[i][j];
        }
    }
    return result;
}

// matrix should be an array of arrays in row-major format
// [
// [m00, m01, ..., m0n],
// [m10, m11, ..., m1n],
// ...
// [mm0, mm1, ..., mmn]
// ]
export function frobenius_norm_matrix(m) {
    m = roll_list_into_column_vec_matrix(m);

    let sum = 0;

    for (let i = 0; i < m.length; i++) {
        for (let j = 0; j < m[i].length; j++) {
            sum += m[i][j] * m[i][j];
        }
    }

    // Return the square root of the sum
    return Math.sqrt(sum);
}

// matrix should be an array of arrays in row-major format
// [
// [m00, m01, ..., m0n],
// [m10, m11, ..., m1n],
// ...
// [mm0, mm1, ..., mmn]
// ]
export function mul_matrix_scalar(m, scalar) {
    m = roll_list_into_column_vec_matrix(m);

    /*
    let result = new Array(m.length);

    for (let i = 0; i < m.length; i++) {
        result[i] = new Array(m[i].length);

        for (let j = 0; j < m[i].length; j++) {
            result[i][j] = m[i][j] * scalar;
        }
    }
    */

    let out = [];
    for(let i = 0; i<m.length; i++) {
        let row = [];
        for(let j = 0; j<m[i].length; j++) {
            row.push(m[i][j] * scalar);
        }
        out.push(row);
    }

    return out;
}

// matrix should be an array of arrays in row-major format
// [
// [m00, m01, ..., m0n],
// [m10, m11, ..., m1n],
// ...
// [mm0, mm1, ..., mmn]
// ]
export function div_matrix_scalar(m, scalar) {
    m = roll_list_into_column_vec_matrix(m);

    let result = new Array(m.length);

    for (let i = 0; i < m.length; i++) {
        result[i] = new Array(m[i].length);

        for (let j = 0; j < m[i].length; j++) {
            result[i][j] = m[i][j] / scalar;
        }
    }

    return result;
}

// matrix should be an array of arrays in row-major format
// [
// [m00, m01, ..., m0n],
// [m10, m11, ..., m1n],
// ...
// [mm0, mm1, ..., mmn]
// ]
export function normalized_matrix(m) {
    m = roll_list_into_column_vec_matrix(m);

    let f = frobenius_norm_matrix(m);
    return div_matrix_scalar(m, f);
}

// matrices should be an array of arrays in row-major format
// [
// [m00, m01, ..., m0n],
// [m10, m11, ..., m1n],
// ...
// [mm0, mm1, ..., mmn]
// ]
export function mul_matrix_matrix(m1, m2) {
    // m1 = roll_list_into_column_vec_matrix(m1);
    // m2 = roll_list_into_column_vec_matrix(m2);
    // console.log(m1);
    // console.log(m2);

    if (m1[0].length !== m2.length) {
        throw new Error('Incompatible matrix dimensions');
    }

    const result = new Array(m1.length).fill(0).map(() => new Array(m2[0].length).fill(0));

    for (let i = 0; i < m1.length; i++) {
        for (let j = 0; j < m2[0].length; j++) {
            for (let k = 0; k < m1[0].length; k++) {
                result[i][j] += m1[i][k] * m2[k][j];
            }
        }
    }

    return result;
}

/*
// matrix should be an array of arrays in row-major format
// [
// [m00, m01],
// [m10, m11]
// ]
// vector should be in format
// [ v0, v1 ]
export function mul_matrix_2x2_vector_2x1(matrix, vector) {
    let res = mul_matrix_matrix( matrix, [[vector[0]], [vector[1]]] );
    return [res[0][0], res[1][0]];
}

// matrix should be an array of arrays in row-major format
// [
// [m00, m01, m02],
// [m10, m11, m12],
// [m20, m21, m22]
// ]
// vector should be in format
// [ v0, v1, v2 ]
export function mul_matrix_3x3_vector_3x1(matrix, vector) {
    let res = mul_matrix_matrix(matrix, [[vector[0]], [vector[1]], [vector[2]]]);
    return [res[0][0], res[1][0], res[2][0]];
}

// matrix should be an array of arrays in row-major format
// [
// [m00, m01, m02],
// [m10, m11, m12],
// [m20, m21, m22]
// ]
// vector should be in format
// [ v0, v1 ]
export function mul_matrix_3x3_vector_2x1(matrix, vector, pad_value_at_end_of_vector=1.0) {
    let res = mul_matrix_matrix(matrix, [[vector[0]], [vector[1]], [pad_value_at_end_of_vector]]);
    return [res[0][0], res[1][0]];
}

// matrix should be an array of arrays in row-major format
// [
// [m00, m01, m02, m03],
// [m10, m11, m12, m13],
// [m20, m21, m22, m23],
// [m30, m31, m32, m33],
// ]
// vector should be in format
// [ v0, v1, v2, v3 ]
export function mul_matrix_4x4_vector_4x1(matrix, vector) {
    let res = mul_matrix_matrix(matrix, [[vector[0]], [vector[1]], [vector[2]], [vector[3]]]);
    return [res[0][0], res[1][0], res[2][0], res[3][0]];
}

// matrix should be an array of arrays in row-major format
// [
// [m00, m01, m02, m03],
// [m10, m11, m12, m13],
// [m20, m21, m22, m23],
// [m30, m31, m32, m33],
// ]
// vector should be in format
// [ v0, v1, v2 ]
export function mul_matrix_4x4_vector_3x1(matrix, vector, pad_value_at_end_of_vector=1.0) {
    let res = mul_matrix_matrix(matrix, [[vector[0]], [vector[1]], [vector[2]], [vector[3]], [pad_value_at_end_of_vector]]);
    return [res[0][0], res[1][0], res[2][0]];
}
*/

// vectors should be in column vector matrix form
// [
// [x],
// [y],
// [z]
// ]
export function cross_product(v1, v2) {
    let v1u = unroll_matrix_to_list(v1);
    let v2u = unroll_matrix_to_list(v2);
    let res = cross_product_unrolled(v1u, v2u);
    return [ [res[0]], [res[1]], [res[2]] ]
}

// vectors should be arrays of three values
// [ x, y, z ]
export function cross_product_unrolled(v1, v2) {
    const x = v1[1] * v2[2] - v1[2] * v2[1];
    const y = v1[2] * v2[0] - v1[0] * v2[2];
    const z = v1[0] * v2[1] - v1[1] * v2[0];

    return [x, y, z];
}

// vectors should be in column vector matrix form
// [
// [.],
// [.],
// [.],
// ...,
// [.]
// ]
export function dot_product(v1, v2) {
    let v1u = unroll_matrix_to_list(v1);
    let v2u = unroll_matrix_to_list(v2);

    return dot_product_unrolled(v1u, v2u);
}

// vectors should be arrays of three values
// [ ., ., ., ..., . ]
export function dot_product_unrolled(v1, v2) {
    if (v1.length !== v2.length) {
        throw new Error("Both vectors must be of the same dimension");
    }

    let dot_product = 0;
    for (let i = 0; i < v1.length; i++) {
        dot_product += (v1[i] * v2[i]);
    }

    return dot_product;
}

export function identity_matrix(n) {
    let out = [];
    for(let i = 0; i < n; i++) {
        let row = [];
        for(let j = 0; j < n; j++) {
            row.push(0.0);
        }
        row[i] = 1.0;
        out.push(row);
    }
    return out;
}

export function transpose(matrix) {
    const numRows = matrix.length;
    const numCols = matrix[0].length;

    // Initialize an empty transposed matrix
    const transposed = new Array(numCols);
    for (let i = 0; i < numCols; i++) {
        transposed[i] = new Array(numRows);
    }

    // Fill the transposed matrix
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            transposed[j][i] = matrix[i][j];
        }
    }

    return transposed;
}

export function add_complex_numbers(z1, z2) {
    z1 = unroll_matrix_to_list(z1);
    z2 = unroll_matrix_to_list(z2);

    let a1 = z1[0];
    let a2 = z2[0];
    let b1 = z1[1];
    let b2 = z2[1];

    let new_real_part = a1 + a2;
    let new_im_part = b1 + b2;

    return [new_real_part, new_im_part];
}

export function mul_complex_numbers(z1, z2) {
    z1 = unroll_matrix_to_list(z1);
    z2 = unroll_matrix_to_list(z2);

    let a1 = z1[0];
    let a2 = z2[0];
    let b1 = z1[1];
    let b2 = z2[1];

    let new_real_part = a1*a2 - b1*b2;
    let new_im_part = a1*b2 + a2*b1;

    return [new_real_part, new_im_part];
}

export function factorial(n) {
    if (n === 0 || n === 1) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
}

export function unroll_matrix_to_list(matrix) {
    if (!Array.isArray(matrix[0])) {
        return matrix;
    }

    let unrolledArray = [];
    for (let i = 0; i < matrix.length; i++) {
        unrolledArray = unrolledArray.concat(matrix[i]);
    }

    return unrolledArray;
}

export function roll_list_into_matrix(list, num_rows, num_cols) {
    if (Array.isArray(list[0])) {
        return list;
    }

    let matrix = [];
    for (let row = 0; row < num_rows; row++) {
        let rowArray = [];
        for (let col = 0; col < num_cols; col++) {
            let index = row * num_cols + col;
            if (index < list.length) {
                rowArray.push(list[index]);
            } else {
                rowArray.push(null); // or any other default value as needed
            }
        }
        matrix.push(rowArray);
    }
    return matrix;
}

export function roll_list_into_column_vec_matrix(list) {
    return roll_list_into_matrix(list, list.length, 1);
}

export function roll_list_into_row_vec_matrix(list) {
    return roll_list_into_matrix(list, 1, list.length);
}

export function matrix_inverse_3x3(A) {
    let det = A[0][0] * (A[1][1] * A[2][2] - A[2][1] * A[1][2]) -
        A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
        A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

    if (det === 0) {
        return null; // No inverse exists if determinant is 0
    }

    let cofactors = [
        [
            (A[1][1] * A[2][2] - A[2][1] * A[1][2]),
            -(A[1][0] * A[2][2] - A[1][2] * A[2][0]),
            (A[1][0] * A[2][1] - A[2][0] * A[1][1])
        ],
        [
            -(A[0][1] * A[2][2] - A[0][2] * A[2][1]),
            (A[0][0] * A[2][2] - A[0][2] * A[2][0]),
            -(A[0][0] * A[2][1] - A[2][0] * A[0][1])
        ],
        [
            (A[0][1] * A[1][2] - A[0][2] * A[1][1]),
            -(A[0][0] * A[1][2] - A[1][0] * A[0][2]),
            (A[0][0] * A[1][1] - A[1][0] * A[0][1])
        ]
    ];

    let adjugate = [
        [cofactors[0][0] / det, cofactors[1][0] / det, cofactors[2][0] / det],
        [cofactors[0][1] / det, cofactors[1][1] / det, cofactors[2][1] / det],
        [cofactors[0][2] / det, cofactors[1][2] / det, cofactors[2][2] / det]
    ];

    return adjugate;
}

export function proj_pt_onto_line(pt, a, b, clamp=false) {
    let b_minus_a = sub_matrix_matrix(b, a);
    let pt_minus_a = sub_matrix_matrix(pt, a);

    return add_matrix_matrix(proj(pt_minus_a, b_minus_a, clamp), a);
}

export function pt_dis_to_line(pt, a, b, clamp=false) {
    let p = proj_pt_onto_line(pt, a, b, clamp);
    let diff = sub_matrix_matrix(p, pt);

    return frobenius_norm_matrix(diff);
}

export function proj(v, u, clamp=false) {
    let p = proj_scalar(v, u);
    if(clamp) { p = Math.min(Math.max(p, 0.0), 1.0); }

    return mul_matrix_scalar(u, p);
}

export function proj_scalar(v, u) {
    let n = dot_product(v, u);
    let d = Math.max(dot_product(u, u), 0.000000001);
    return n/d;
}

