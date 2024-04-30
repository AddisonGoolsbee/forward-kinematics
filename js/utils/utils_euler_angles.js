/**
 * Author: Danny Rakita
 * Description: For CPSC-487-587 3D Spatial Modeling and Computing at Yale University
 */

import {get_default_lil_gui, refresh_displays} from "./utils_three.js";
import {add_matrix_matrix, mul_matrix_matrix} from "./utils_math.js";

export function get_x_rotation_so3_matrix(theta) {
    return [[1, 0, 0], [0, Math.cos(theta), -Math.sin(theta)], [0, Math.sin(theta), Math.cos(theta)]];
}

export function get_y_rotation_so3_matrix(theta) {
    return [[Math.cos(theta), 0, Math.sin(theta)], [0, 1, 0], [-Math.sin(theta), 0, Math.cos(theta)]];
}

export function get_z_rotation_so3_matrix(theta) {
    return [[Math.cos(theta), -Math.sin(theta), 0], [Math.sin(theta), Math.cos(theta), 0], [0,0,1]];
}

export function get_rotation_so3_matrix(axis_string, theta) {
    if(axis_string === 'x') {
        return get_x_rotation_so3_matrix(theta);
    } else if(axis_string === 'y') {
        return get_y_rotation_so3_matrix(theta);
    } else if(axis_string === 'z') {
        return get_z_rotation_so3_matrix(theta);
    }
}

function draw_euler_angle_intermediate_coordinate_frame(engine, offset_position, matrix, length=1, tail_width=0.04) {
    let x = [[length], [0], [0]];
    let y = [[0], [length], [0]];
    let z = [[0], [0], [length]];

    let mapped_x = mul_matrix_matrix(matrix, x);
    let mapped_y = mul_matrix_matrix(matrix, y);
    let mapped_z = mul_matrix_matrix(matrix, z);

    let mapped_x_t = add_matrix_matrix(mapped_x, offset_position);
    let mapped_y_t = add_matrix_matrix(mapped_y, offset_position);
    let mapped_z_t = add_matrix_matrix(mapped_z, offset_position);

    engine.draw_debug_vector(offset_position, mapped_x_t, tail_width, undefined, 0xff2222);
    engine.draw_debug_vector(offset_position, mapped_y_t, tail_width, undefined, 0x22ff22);
    engine.draw_debug_vector(offset_position, mapped_z_t, tail_width, undefined, 0x2222ff);
}

export class EulerAnglesVisualizer {
    constructor(engine, order_active=true) {
        engine.add_suzanne_monkey_as_mesh_object(0x00eeff);

        this.gui = get_default_lil_gui();

        this.settings = {
            mesh_visible: false,
            draw_points: true,
            wireframe_visible: true,
            point_size: 0.02,
            r1:0,
            r2:0,
            r3:0,
            order: ['x', 'y', 'z'],
            determinant_string: 1.0
        }

        this.actions = {
            reset_matrix: () => {
                this.settings.r1 = 0;
                this.settings.r2 = 0;
                this.settings.r3 = 0;
                refresh_displays(this.gui);
            }
        };

        let order = {
            XYZ: ['x', 'y', 'z'],
            YZX: ['y', 'z', 'x'],
            ZXY: ['z', 'x', 'y'],
            XZY: ['x', 'z', 'y'],
            ZYX: ['z', 'y', 'x'],
            YXZ: ['y', 'x', 'z'],
            ZXZ: ['z', 'x', 'z'],
            XYX: ['x', 'y', 'x'],
            YZY: ['y', 'z', 'y'],
            ZYZ: ['z', 'y', 'z'],
            XZX: ['x', 'z', 'x'],
            YXY: ['y', 'x', 'y']
        }

        this.gui.add(this.settings, 'draw_points').name('Draw Points');
        this.gui.add(this.settings, 'wireframe_visible').name('Draw Wireframe');
        this.gui.add(this.settings, 'mesh_visible').name('Draw Mesh');
        this.gui.add(this.settings, 'point_size', 0.001, 0.03).name('Point Size');

        let folder = this.gui.addFolder('Matrix Controls');
        let o = folder.add(this.settings, 'order', order).name('order');
        if (!order_active) {
            o.disable();
        }
        folder.add(this.settings, 'r1', -3.14159, 3.14159).name('r1');
        folder.add(this.settings, 'r2', -3.14159, 3.14159).name('r2');
        folder.add(this.settings, 'r3', -3.14159, 3.14159).name('r3');
        folder.add(this.actions, 'reset_matrix').name('Reset Matrix');
        folder.add(this.settings, 'determinant_string').name('Determinant').disable();

        this.standard_points = engine.get_local_vertex_positions_of_mesh_object(0);
        this.wireframe_points = engine.get_local_vertex_positions_of_mesh_object_wireframe(0);
    }

    three_loop_function(engine) {
        let order = this.settings.order;

        let o1 = order[0];
        let o2 = order[1];
        let o3 = order[2];

        let mm1 = get_rotation_so3_matrix(o1, this.settings.r1);
        let mm2 = get_rotation_so3_matrix(o2, this.settings.r2);
        let mm3 = get_rotation_so3_matrix(o3, this.settings.r3);

        let m1 = mm1;
        let m2 = mul_matrix_matrix(m1, mm2);
        let m3 = mul_matrix_matrix(m2, mm3);

        draw_euler_angle_intermediate_coordinate_frame(engine, [[0], [-2.5], [2]], m1);
        draw_euler_angle_intermediate_coordinate_frame(engine, [[0], [0], [2]], m2);
        draw_euler_angle_intermediate_coordinate_frame(engine, [[0], [2.5], [2]], m3);

        let new_standard_points = this.standard_points.map(point => mul_matrix_matrix(m3, point));
        let new_wireframe_points = this.wireframe_points.map(point => mul_matrix_matrix(m3, point));

        engine.update_vertex_positions_of_mesh_object(0, new_standard_points);
        engine.update_vertex_positions_of_mesh_object_wireframe(0, new_wireframe_points);

        if (this.settings.draw_points) {
            new_standard_points.forEach(point => {
                engine.draw_debug_sphere(point, this.settings.point_size, 0xeeee00);
            });
        }

        engine.mesh_objects[0].visible = this.settings.mesh_visible;
        engine.set_mesh_object_wireframe_visibility(0, this.settings.wireframe_visible);
    }
}

export class EulerAngleInterpolatorVisualizer {
    constructor(engine, order_active=true) {
        engine.add_suzanne_monkey_as_mesh_object(0xeeff00);
        engine.add_suzanne_monkey_as_mesh_object(0x00eeff);
        engine.add_suzanne_monkey_as_mesh_object(0xee00ff);

        engine.toggle_mesh_object_visibility(0);
        engine.toggle_mesh_object_visibility(2);
        engine.toggle_mesh_object_wireframe_visibility(0);
        engine.toggle_mesh_object_wireframe_visibility(2);

        this.gui = get_default_lil_gui();

        this.settings = {
            mesh_visible: false,
            draw_points: true,
            wireframe_visible: true,
            point_size: 0.02,
            r1a:0,
            r2a:0,
            r3a:0,
            r1b:0,
            r2b:0,
            r3b:0,
            t: 0,
            order: ['x', 'y', 'z'],
            play: false,
            determinant_string: 1.0
        }

        this.actions = {
            reset_matrix_a: () => {
                this.settings.r1a = 0;
                this.settings.r2a = 0;
                this.settings.r3a = 0;
                refresh_displays(this.gui);
            },
            reset_matrix_b: () => {
                this.settings.r1b = 0;
                this.settings.r2b = 0;
                this.settings.r3b = 0;
                refresh_displays(this.gui);
            },
            reset_t: () => {
                this.settings.t = 0;
                refresh_displays(this.gui);
            },
            play: () => {
                this.settings.play = true;
                play_button.disable();
                // stop_button.enable();
                refresh_displays(this.gui);
            },
            stop: () => {
                this.settings.play = false;
                play_button.enable();
                // stop_button.disable();
                refresh_displays(this.gui);
            }
        };

        let order = {
            XYZ: ['x', 'y', 'z'],
            YZX: ['y', 'z', 'x'],
            ZXY: ['z', 'x', 'y'],
            XZY: ['x', 'z', 'y'],
            ZYX: ['z', 'y', 'x'],
            YXZ: ['y', 'x', 'z'],
            ZXZ: ['z', 'x', 'z'],
            XYX: ['x', 'y', 'x'],
            YZY: ['y', 'z', 'y'],
            ZYZ: ['z', 'y', 'z'],
            XZX: ['x', 'z', 'x'],
            YXY: ['y', 'x', 'y']
        }

        this.gui.add(this.settings, 'draw_points').name('Draw Points');
        this.gui.add(this.settings, 'wireframe_visible').name('Draw Wireframe');
        this.gui.add(this.settings, 'mesh_visible').name('Draw Mesh');
        this.gui.add(this.settings, 'point_size', 0.001, 0.03).name('Point Size');
        let o = this.gui.add(this.settings, 'order', order).name('order');
        if (!order_active) {
            o.disable();
        }

        let folder_a = this.gui.addFolder('Matrix Controls A');
        folder_a.add(this.settings, 'r1a', -3.14159, 3.14159).name('r1a');
        folder_a.add(this.settings, 'r2a', -3.14159, 3.14159).name('r2a');
        folder_a.add(this.settings, 'r3a', -3.14159, 3.14159).name('r3a');
        folder_a.add(this.actions, 'reset_matrix_a').name('Reset Matrix A');

        let folder_b = this.gui.addFolder('Matrix Controls B');
        folder_b.add(this.settings, 'r1b', -3.14159, 3.14159).name('r1b');
        folder_b.add(this.settings, 'r2b', -3.14159, 3.14159).name('r2b');
        folder_b.add(this.settings, 'r3b', -3.14159, 3.14159).name('r3b');
        folder_b.add(this.actions, 'reset_matrix_b').name('Reset Matrix B');

        let folder = this.gui.addFolder('Interpolation');
        folder.add(this.settings, 't', 0, 1).onChange(() => {
            this.actions.stop();
        });
        let play_button = folder.add(this.actions, 'play');
        let stop_button = folder.add(this.actions, 'stop');
        folder.add(this.actions, 'reset_t').name('reset');

        this.standard_points0 = engine.get_local_vertex_positions_of_mesh_object(0);
        this.wireframe_points0 = engine.get_local_vertex_positions_of_mesh_object_wireframe(0);

        this.standard_points1 = engine.get_local_vertex_positions_of_mesh_object(1);
        this.wireframe_points1 = engine.get_local_vertex_positions_of_mesh_object_wireframe(1);

        this.standard_points2 = engine.get_local_vertex_positions_of_mesh_object(2);
        this.wireframe_points2 = engine.get_local_vertex_positions_of_mesh_object_wireframe(2);
    }

    three_loop_function(engine) {
        if(this.settings.play) {
            this.settings.t += 0.005;
            if(this.settings.t > 1.0) {
                this.settings.t = 0;
            }
            refresh_displays(this.gui);
        }

        let order = this.settings.order;

        let o1 = order[0];
        let o2 = order[1];
        let o3 = order[2];

        let mm1a = get_rotation_so3_matrix(o1, this.settings.r1a);
        let mm2a = get_rotation_so3_matrix(o2, this.settings.r2a);
        let mm3a = get_rotation_so3_matrix(o3, this.settings.r3a);

        let m1a = mm1a;
        let m2a = mul_matrix_matrix(m1a, mm2a);
        let m3a = mul_matrix_matrix(m2a, mm3a);

        draw_euler_angle_intermediate_coordinate_frame(engine, [[0], [-3.5], [2]], m1a, 0.25, 0.01);
        draw_euler_angle_intermediate_coordinate_frame(engine, [[0], [-3], [2]], m2a, 0.25, 0.01);
        draw_euler_angle_intermediate_coordinate_frame(engine, [[0], [-2.5], [2]], m3a, 0.25, 0.01);

        let mm1b = get_rotation_so3_matrix(o1, this.settings.r1b);
        let mm2b = get_rotation_so3_matrix(o2, this.settings.r2b);
        let mm3b = get_rotation_so3_matrix(o3, this.settings.r3b);

        let m1b = mm1b;
        let m2b = mul_matrix_matrix(m1b, mm2b);
        let m3b = mul_matrix_matrix(m2b, mm3b);

        draw_euler_angle_intermediate_coordinate_frame(engine, [[0], [2.5], [2]], m1b, 0.25, 0.01);
        draw_euler_angle_intermediate_coordinate_frame(engine, [[0], [3], [2]], m2b, 0.25, 0.01);
        draw_euler_angle_intermediate_coordinate_frame(engine, [[0], [3.5], [2]], m3b, 0.25, 0.01);

        let r1i = (1 - this.settings.t) * this.settings.r1a + this.settings.t * this.settings.r1b;
        let r2i = (1 - this.settings.t) * this.settings.r2a + this.settings.t * this.settings.r2b;
        let r3i = (1 - this.settings.t) * this.settings.r3a + this.settings.t * this.settings.r3b;

        let mm1i = get_rotation_so3_matrix(o1, r1i);
        let mm2i = get_rotation_so3_matrix(o2, r2i);
        let mm3i = get_rotation_so3_matrix(o3, r3i);

        let m1i = mm1i;
        let m2i = mul_matrix_matrix(m1i, mm2i);
        let m3i = mul_matrix_matrix(m2i, mm3i);

        draw_euler_angle_intermediate_coordinate_frame(engine, [[0], [-0.5], [2]], m1i, 0.25, 0.01);
        draw_euler_angle_intermediate_coordinate_frame(engine, [[0], [0], [2]], m2i, 0.25, 0.01);
        draw_euler_angle_intermediate_coordinate_frame(engine, [[0], [0.5], [2]], m3i, 0.25, 0.01);


        let new_wireframe_points0 = this.wireframe_points0.map(point => add_matrix_matrix(mul_matrix_matrix(m3a, point), [[0], [-3], [0]]));
        engine.update_vertex_positions_of_mesh_object_wireframe(0, new_wireframe_points0);

        let new_wireframe_points2 = this.wireframe_points2.map(point => add_matrix_matrix(mul_matrix_matrix(m3b, point), [[0], [3], [0]]));
        engine.update_vertex_positions_of_mesh_object_wireframe(2, new_wireframe_points2);

        let new_standard_points1 = this.standard_points1.map(point => mul_matrix_matrix(m3i, point));
        let new_wireframe_points1 = this.wireframe_points1.map(point => mul_matrix_matrix(m3i, point));

        engine.update_vertex_positions_of_mesh_object(1, new_standard_points1);
        engine.update_vertex_positions_of_mesh_object_wireframe(1, new_wireframe_points1);

        if (this.settings.draw_points) {
            new_standard_points1.forEach(point => {
                engine.draw_debug_sphere(point, this.settings.point_size, 0xeeee00);
            });
        }

        engine.mesh_objects[1].visible = this.settings.mesh_visible;
        engine.set_mesh_object_wireframe_visibility(1, this.settings.wireframe_visible);

        refresh_displays(this.gui);
    }
}