/**
 * Author: Danny Rakita
 * Description: For CPSC-487-587 3D Spatial Modeling and Computing at Yale University
 */

import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {ParametricGeometry} from 'three/examples/jsm/geometries/ParametricGeometry.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import {
    add_matrix_matrix,
    cross_product,
    dot_product, mul_matrix_scalar,
    normalized_matrix,
    roll_list_into_matrix,
    unroll_matrix_to_list
} from "./utils_math.js";

export class ThreeEngine {
    constructor(scene, camera, renderer, controls, stats) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
        this.stats = stats;
        this.mesh_objects = [];
        this.mesh_object_wireframes = [];
        this.mesh_objects_local_vertex_positions = [];
        this.mesh_object_wireframes_local_vertex_positions = [];
        this.line_objects = [];
        this.num_line_objects_used_on_curr_frame = 0;
        this.sphere_objects = [];
        this.num_sphere_objects_used_on_curr_frame = 0;
        this.cone_objects = [];
        this.num_cone_objects_used_on_curr_frame = 0;
        this.plane_objects = [];
        this.num_plane_objects_used_on_curr_frame = 0;
        this.gizmo_controller_objects = [];
        this.gizmo_controllers = [];
        this.frame_idx = 0;
        this.clock = new THREE.Clock();
        threejs_responsive_canvas(this.camera, this.renderer);
    }

    static #new_default_generic(orthographic_camera=false) {
        const scene = new THREE.Scene();
        let camera;
        if(orthographic_camera) {
            let frustumSize = 10;
            let aspect = window.innerWidth / window.innerHeight;
            let frustumHalfHeight = frustumSize / 2;
            let frustumHalfWidth = frustumHalfHeight * aspect;
            camera = new THREE.OrthographicCamera(
                -frustumHalfWidth,
                frustumHalfWidth,
                frustumHalfHeight,
                -frustumHalfHeight,
                -1000,
                1000
            );
        } else {
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        }

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.addEventListener('DOMContentLoaded', (event) => {
            if (!document.body.contains(renderer.domElement)) {
                document.body.appendChild(renderer.domElement);
            }
        });
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // soft white light
        // ambientLight.castShadow = true;
        // ambientLight.castShadow = true;
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 70, 1000); // color, intensity, distance
        // pointLight.position.set(1, 5, 0); // position the light
        z_up_set_object_position(pointLight, 1, 0, 5);
        pointLight.castShadow = true;
        // pointLight.shadow.mapSize.width = 2048;
        // pointLight.shadow.mapSize.height = 2048;
        scene.add(pointLight);

        const pointLight2 = new THREE.PointLight(0xffffff, 100, 1000); // color, intensity, distance
        // pointLight2.position.set(-2, 3, 1); // position the light
        z_up_set_object_position(pointLight2, -2, -1, 3);
        pointLight2.castShadow = true;
        // pointLight2.shadow.mapSize.width = 2048;
        // pointLight2.shadow.mapSize.height = 2048;
        // scene.add(pointLight2);

        const pointLight3 = new THREE.PointLight(0xffffff, 100, 1000); // color, intensity, distance
        // pointLight2.position.set(-2, 3, 1); // position the light
        z_up_set_object_position(pointLight2, 2, -1, -3);
        pointLight2.castShadow = true;
        // pointLight2.shadow.mapSize.width = 2048;
        // pointLight2.shadow.mapSize.height = 2048;
        // scene.add(pointLight3);

        scene.background = new THREE.Color(0xF3F3FE);

        // const floorGeometry = new THREE.PlaneGeometry(20, 20); // 10x10 size
        // const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        // const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        // floor.rotation.x = -Math.PI / 2;
        // floor.receiveShadow = true; // Enable receiving shadows
        // floor.position.y = -2; // Lower it by 1 unit

        // scene.add(floor);

        var size = 20;  // The size of the grid
        var divisions = 20; // The number of divisions (grid lines)

        var gridHelper = new THREE.GridHelper(size, divisions);
        scene.add(gridHelper);

        spawn_line_base(scene, convert_z_up_array_to_y_up_array([0.,0.,0.]), convert_z_up_array_to_y_up_array([10.,0.,0.]), false, 0.02, 0xff0000);
        spawn_line_base(scene, convert_z_up_array_to_y_up_array([0.,0.,0.]), convert_z_up_array_to_y_up_array([0.,10.,0.]), false, 0.02, 0x00ff00);

        var stats = new Stats();
        document.body.appendChild(stats.dom);

        // To align top-left
        stats.dom.style.position = 'absolute';
        stats.dom.style.top = '10px';
        stats.dom.style.left = '10px';

        return new ThreeEngine(scene, camera, renderer, controls, stats);
    }

    static new_default_2d() {
        let engine = ThreeEngine.#new_default_generic(true);
        z_up_set_object_position(engine.camera, 0, 0, 5);
        engine.controls.enableRotate = false;
        engine.is2D = true;

        window.addEventListener('resize', engine.on_window_resize_orthographic.bind(engine), false);

        return engine;
    }

    static new_default_3d(camera_x=3, camera_y=2, camera_z=1, orthographic_camera=false) {
        let engine = ThreeEngine.#new_default_generic(orthographic_camera);
        z_up_set_object_position(engine.camera, camera_x, camera_y, camera_z);
        engine.camera.lookAt(0,0,0);
        engine.is2D = false;

        if (orthographic_camera) {
            window.addEventListener('resize', engine.on_window_resize_orthographic.bind(engine), false);
        }

        return engine;
    }

    on_window_resize_orthographic() {
        let frustumSize = 10;
        let aspect = window.innerWidth / window.innerHeight;
        let frustumHalfHeight = frustumSize / 2;
        let frustumHalfWidth = frustumHalfHeight * aspect;

        this.camera.left = -frustumHalfWidth;
        this.camera.right = frustumHalfWidth;
        this.camera.top = frustumHalfHeight;
        this.camera.bottom = -frustumHalfHeight;

        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    async add_stl_mesh_object(path) {
        try {
            const mesh = await load_stl(path, this.scene);
            // mesh.setRotationFromQuaternion(new THREE.Quaternion());
            z_up_set_object_rotation_from_quaternion(mesh, 1,0,0,0);
            this.mesh_objects_local_vertex_positions.push(get_local_vertex_positions_of_object(mesh.geometry, mesh.quaternion,true, this.is2D));

            let wireframeMaterial = new THREE.LineBasicMaterial({color: 0x333333});
            let wireframeGeometry = new THREE.WireframeGeometry(mesh.geometry);
            let wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
            wireframe.visible = false;
            wireframe.setRotationFromQuaternion(mesh.quaternion);
            this.mesh_object_wireframes_local_vertex_positions.push(get_local_vertex_positions_of_object(wireframe.geometry, wireframe.quaternion,true, this.is2D));

            mesh.add(wireframe);
            this.mesh_object_wireframes.push(wireframe);
            this.scene.add(wireframe);

            let idx = this.mesh_objects.length;
            this.mesh_objects.push(mesh);
            return idx;
        } catch (error) {
            console.error(error);
        }
    }

    async add_gltf_mesh_object(path) {
        try {
            let out_idxs = [];
            const meshes = await load_gltf_safely(path, this.scene);
            meshes.forEach(mesh => {
                // mesh.setRotationFromQuaternion(new THREE.Quaternion());
                z_up_set_object_rotation_from_quaternion(mesh, 1, 0, 0, 0);
                this.mesh_objects_local_vertex_positions.push(get_local_vertex_positions_of_object(mesh.geometry, mesh.quaternion, true, this.is2D));

                let wireframeMaterial = new THREE.LineBasicMaterial({color: 0x333333});
                let wireframeGeometry = new THREE.WireframeGeometry(mesh.geometry);
                let wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
                wireframe.visible = false;
                wireframe.setRotationFromQuaternion(mesh.quaternion);
                this.mesh_object_wireframes_local_vertex_positions.push(get_local_vertex_positions_of_object(wireframe.geometry, wireframe.quaternion, true, this.is2D));

                mesh.add(wireframe);
                this.mesh_object_wireframes.push(wireframe);
                this.scene.add(wireframe);

                let idx = this.mesh_objects.length;
                out_idxs.push(idx);

                this.mesh_objects.push(mesh);
            });

            return out_idxs;
        } catch (error) {
            console.error(error);
        }
    }

    add_suzanne_monkey_as_mesh_object(color=0x00ff00) {
        return this.add_obj_from_string_mesh_object(suzanne_monkey_obj_string(), color);
    }

    add_suzanne_monkey_highres_as_mesh_object(color=0x00ff00) {
        return this.add_obj_from_string_mesh_object(suzanne_monkey_highres_obj_string(), color);
    }

    add_standard2Dshape_as_mesh_object(color=0x00ff00) {
        return this.add_obj_from_string_mesh_object(standard2Dshape_obj_string(), color);
    }

    add_obj_from_string_mesh_object(string, color=0x00ff00) {
        const mesh = load_obj_from_string(this.scene, string, color);
        // mesh.setRotationFromQuaternion(new THREE.Quaternion());
        z_up_set_object_rotation_from_quaternion(mesh, 1, 0, 0, 0);
        this.mesh_objects_local_vertex_positions.push(get_local_vertex_positions_of_object(mesh.geometry, mesh.quaternion, true, this.is2D));

        let wireframeMaterial = new THREE.LineBasicMaterial({color: 0x333333});
        let wireframeGeometry = new THREE.WireframeGeometry(mesh.geometry);
        let wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        wireframe.visible = false;
        wireframe.setRotationFromQuaternion(mesh.quaternion);
        this.mesh_object_wireframes_local_vertex_positions.push(get_local_vertex_positions_of_object(wireframe.geometry, wireframe.quaternion,true, this.is2D));

        mesh.add(wireframe);
        this.mesh_object_wireframes.push(wireframe);
        this.scene.add(wireframe);

        let idx = this.mesh_objects.length;
        this.mesh_objects.push(mesh);
        return idx;
    }

    add_torus_knot_as_mesh_object() {
        const geometry = new THREE.TorusKnotGeometry( 10, 3, 100, 16 );
        const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
        const torusKnot = new THREE.Mesh( geometry, material );
        this.scene.add( torusKnot );

        let wireframeMaterial = new THREE.LineBasicMaterial({color: 0x333333});
        let wireframeGeometry = new THREE.WireframeGeometry(torusKnot.geometry);
        let wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        wireframe.visible = false;
        wireframe.setRotationFromQuaternion(torusKnot.quaternion);

        torusKnot.add(wireframe);
        this.mesh_object_wireframes.push(wireframe);
        this.scene.add(wireframe);

        let idx = this.mesh_objects.length;
        this.mesh_objects.push(torusKnot);
        return idx;
    }

    add_torus_as_mesh_object() {
        const geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
        const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
        const torusKnot = new THREE.Mesh( geometry, material );
        this.scene.add( torusKnot );

        let wireframeMaterial = new THREE.LineBasicMaterial({color: 0x333333});
        let wireframeGeometry = new THREE.WireframeGeometry(torusKnot.geometry);
        let wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        wireframe.visible = false;
        wireframe.setRotationFromQuaternion(torusKnot.quaternion);

        torusKnot.add(wireframe);
        this.mesh_object_wireframes.push(wireframe);
        this.scene.add(wireframe);

        let idx = this.mesh_objects.length;
        this.mesh_objects.push(torusKnot);
        return idx;
    }

    add_gizmo_controller(position, wxyz_quaternion) {
        let idx = undefined;
        for (let i= 0; i < this.gizmo_controller_objects.length; i++) {
            if (!this.gizmo_controller_objects[i].visible) {
                idx = i;
                break;
            }
        }

        if (idx !== undefined) {
            this.gizmo_controllers[idx].visible = true;
            let curr = this.gizmo_controller_objects[idx];
            curr.visible = true;
            let p = unroll_matrix_to_list(position);
            z_up_set_object_position(curr, p[0], p[1], p[2]);
            z_up_set_object_rotation_from_quaternion(curr, wxyz_quaternion[0], wxyz_quaternion[1], wxyz_quaternion[2], wxyz_quaternion[3]);
        } else {
            idx = this.gizmo_controller_objects.length;
            let geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            let material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            let cube = new THREE.Mesh(geometry, material);
            z_up_set_object_position(cube, position[0], position[1], position[2]);
            z_up_set_object_rotation_from_quaternion(cube, wxyz_quaternion[0], wxyz_quaternion[1], wxyz_quaternion[2], wxyz_quaternion[3]);
            this.gizmo_controller_objects.push(cube);
            this.scene.add(cube);

            let transform_controls = new THREE.TransformControls(this.camera, this.renderer.domElement);

            transform_controls.addEventListener('dragging-changed', event => {
                this.controls.enabled = !event.value;
            });

            this.gizmo_controllers.push(transform_controls);
            this.scene.add(transform_controls);
            transform_controls.attach(cube);
        }
        return idx;
    }

    remove_gizmo_controller(idx) {
        this.gizmo_controller_objects[idx].visible = false;
        this.gizmo_controllers[idx].visible = false;
    }

    get_position_of_gizmo_controller(idx) {
        let curr = this.gizmo_controller_objects[idx];
        let position = curr.position;
        let p = convert_threejs_vector3_to_array(position);
        return convert_y_up_array_to_z_up_array(p);
    }

    draw_debug_line(start_point, end_point, render_through_other_objects=false, width=0.01, color=0x0000ff, opacity=1.0) {
        // let y_up_start_point = convert_z_up_array_to_y_up_array(start_point);
        /*
        let y_up_end_point = convert_z_up_array_to_y_up_array(unroll_matrix_to_list(end_point));
        let a = unroll_matrix_to_list(start_point);
        let b = unroll_matrix_to_list(end_point);


        let a_vec = new THREE.Vector3(a[0], a[1], a[2]);
        let b_vec  = new THREE.Vector3(b[0], b[1], b[2]);
        let dis = a_vec.distanceTo(b_vec);
        */

        if (this.num_line_objects_used_on_curr_frame >= this.line_objects.length) {
            // let line = spawn_line_base(this.scene, convert_z_up_array_to_y_up_array([0,0,0]), convert_z_up_array_to_y_up_array([0,-1,0]), undefined, 1.0);
            let line = spawn_line_default(this.scene, render_through_other_objects, color, opacity);
            line.visible = false;
            this.line_objects.push(line);
        }
        let line_object = this.line_objects[this.num_line_objects_used_on_curr_frame];
        set_line_specific(line_object, start_point, end_point, render_through_other_objects, width, color, opacity);

        /*
        line_object.visible = true;
        line_object.material.color.set(color);
        z_up_set_object_position(line_object, a[0], a[1], a[2]);
        line_object.scale.set(width,width,dis);
        line_object.lookAt(y_up_end_point[0], y_up_end_point[1], y_up_end_point[2]);

        if (render_through_other_objects) { line_object.material.depthTest = false; }
        */

        this.num_line_objects_used_on_curr_frame++;
    }

    draw_debug_sphere(center_point, radius, color=0x00ff00, opacity=1.0, num_segments=10) {
        // let a = convert_z_up_array_to_y_up_array(center_point);
        // let a = unroll_matrix_to_list(center_point);
        if (this.num_sphere_objects_used_on_curr_frame >= this.sphere_objects.length) {
            for (let i = 0; i < 500; i++) {
                // let sphere_object = spawn_sphere_base(this.scene, [0.,0.,0.], 1.0);
                let sphere_object = spawn_sphere_default(this.scene, num_segments, color, opacity, undefined);
                sphere_object.visible = false;
                this.sphere_objects.push(sphere_object);
            }
        }
        let sphere_object = this.sphere_objects[this.num_sphere_objects_used_on_curr_frame];
        set_sphere_specific(sphere_object, center_point, radius, undefined, color, opacity);
        /*
        sphere_object.visible = true;
        sphere_object.material.color.set(color);
        z_up_set_object_position(sphere_object, a[0], a[1], a[2]);
        z_up_set_scale(sphere_object, radius, radius, radius);
        */
        this.num_sphere_objects_used_on_curr_frame++;
    }

    draw_debug_cone(start_point, end_point, radius, color=0x0000ff, opacity=1.0) {
        if (this.num_cone_objects_used_on_curr_frame >= this.cone_objects.length) {
            for (let i = 0; i < 500; i++) {
                let cone_object = spawn_cone_default(this.scene);
                cone_object.visible = false;
                this.cone_objects.push(cone_object);
            }
        }

        let cone_object = this.cone_objects[this.num_cone_objects_used_on_curr_frame];
        set_cone_specific(cone_object, start_point, end_point, radius, color, opacity);

        /*
        cone_object.visible = true;
        cone_object.material.color.set(color);
        cone_object.scale.set(radius,dis,radius);
        z_up_set_object_position(cone_object, midpoint.x, midpoint.y, midpoint.z);
        cone_object.lookAt(y_up_end_point[0], y_up_end_point[1], y_up_end_point[2]);
        let quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(new THREE.Euler(Math.PI/2, 0., 0.));
        cone_object.quaternion.multiply(quaternion);
         */

        this.num_cone_objects_used_on_curr_frame++;
    }

    draw_debug_vector(start_point, end_point, tail_width = 0.01, arrow_height = 0.15, color=0x0000ff, opacity=1.0) {
        let a = convert_array_to_threejs_vector3(convert_2array_to_3array(unroll_matrix_to_list(start_point)));
        let b = convert_array_to_threejs_vector3(unroll_matrix_to_list(end_point));
        let dis = a.distanceTo(b);
        let ah = arrow_height;
        if (ah > dis) { ah = dis / 2; }
        let c = a.sub(b).normalize();
        let d = b.add(c.clone().multiplyScalar(ah));
        let e = convert_threejs_vector3_to_array(d);
        let f = b.add(c.clone().multiplyScalar(ah/20));
        let g = convert_threejs_vector3_to_array(f);
        this.draw_debug_line(convert_2array_to_3array(unroll_matrix_to_list(start_point)), g, undefined, tail_width, color, opacity);
        this.draw_debug_cone(e, convert_2array_to_3array(unroll_matrix_to_list(end_point)), tail_width*3, color, opacity);
    }

    draw_debug_plane(center_point, span_vec_1, span_vec_2, width=1, height=1, color=0x0000ff, opacity=1.0) {
        if (this.num_plane_objects_used_on_curr_frame >= this.plane_objects.length) {
            for (let i = 0; i < 500; i++) {
                let plane_object = spawn_plane_base(this.scene, 1,1, color, opacity, false);
                plane_object.visible = false;
                this.plane_objects.push(plane_object);
            }
        }

        let plane_object = this.plane_objects[this.num_plane_objects_used_on_curr_frame];
        set_plane_specific(plane_object, center_point, span_vec_1, span_vec_2, width, height, color, opacity);

        this.num_plane_objects_used_on_curr_frame++;
    }

    draw_debug_grid_plane(center_point, span_vec_1, span_vec_2, width=1, height=1, color=0x222222, opacity= 0.1, grid_line_spacing = 0.25) {
        this.draw_debug_plane(center_point, span_vec_1, span_vec_2, width, height, color, opacity);

        span_vec_1 = normalized_matrix(span_vec_1);
        span_vec_2 = normalized_matrix(span_vec_2);

        let scaled_span_vec_1_positive = mul_matrix_scalar(span_vec_1, width);
        let scaled_span_vec_2_positive = mul_matrix_scalar(span_vec_2, height);
        let scaled_span_vec_1_negative = mul_matrix_scalar(span_vec_1, -width);
        let scaled_span_vec_2_negative = mul_matrix_scalar(span_vec_2, -height);

        let line_opacity = 0.5;
        let line_color = 0x222222;

        // draw cols
        let curr_val = 0.0;
        while (true) {
            let w = 0.003;
            if (curr_val === 0.0) { w = 0.01; }
            let tmp_vec1 = mul_matrix_scalar(span_vec_1, curr_val);
            let tmp_point = add_matrix_matrix(center_point, tmp_vec1);
            let point1 = add_matrix_matrix(tmp_point, scaled_span_vec_2_positive);
            let point2 = add_matrix_matrix(tmp_point, scaled_span_vec_2_negative);
            this.draw_debug_line(point1, point2, false, w, line_color, line_opacity);

            // if (curr_val === 0.0) {
            let tmp_vec2 = mul_matrix_scalar(span_vec_1, -curr_val);
            tmp_point = add_matrix_matrix(center_point, tmp_vec2);
            point1 = add_matrix_matrix(tmp_point, scaled_span_vec_2_positive);
            point2 = add_matrix_matrix(tmp_point, scaled_span_vec_2_negative);
            this.draw_debug_line(point1, point2, false, w, line_color, line_opacity);
            // }

            curr_val += grid_line_spacing;
            if (curr_val > width) { break; }
        }

        // draw rows
        curr_val = 0.0;
        while (true) {
            let w = 0.003;
            if (curr_val === 0.0) { w = 0.01; }
            let tmp_vec1 = mul_matrix_scalar(span_vec_2, curr_val);
            let tmp_point = add_matrix_matrix(center_point, tmp_vec1);
            let point1 = add_matrix_matrix(tmp_point, scaled_span_vec_1_positive);
            let point2 = add_matrix_matrix(tmp_point, scaled_span_vec_1_negative);
            this.draw_debug_line(point1, point2, false, w, line_color, line_opacity);

            // if (curr_val === 0.0) {
            let tmp_vec2 = mul_matrix_scalar(span_vec_2, -curr_val);
            tmp_point = add_matrix_matrix(center_point, tmp_vec2);
            point1 = add_matrix_matrix(tmp_point, scaled_span_vec_1_positive);
            point2 = add_matrix_matrix(tmp_point, scaled_span_vec_1_negative);
            this.draw_debug_line(point1, point2, false, w, line_color, line_opacity);
            // }

            curr_val += grid_line_spacing;
            if (curr_val > height) { break; }
        }

    }

    draw_debug_number_line(center_point, span_vec_1=[[0], [0], [1]], half_length=1, width=0.01, color=0x222222, tick_dis=0.1) {
        let span_vec_normalized = normalized_matrix(span_vec_1);
        let span_vec_scaled1 = mul_matrix_scalar(span_vec_normalized, half_length);
        let span_vec_scaled2 = mul_matrix_scalar(span_vec_normalized, -half_length);
        this.draw_debug_line(center_point, add_matrix_matrix(center_point, span_vec_scaled1), undefined, width, color);
        this.draw_debug_line(center_point, add_matrix_matrix(center_point, span_vec_scaled2), undefined, width, color);

        this.draw_debug_sphere(center_point, width*2.2, color);

        let dis = tick_dis;
        while (dis < half_length) {
            let span_vec_scaled1 = mul_matrix_scalar(span_vec_normalized, dis);
            let span_vec_scaled2 = mul_matrix_scalar(span_vec_normalized, -dis);

            this.draw_debug_sphere(add_matrix_matrix(center_point, span_vec_scaled1), width*1.6, color);
            this.draw_debug_sphere(add_matrix_matrix(center_point, span_vec_scaled2), width*1.6, color);

            dis += tick_dis;
        }
    }

    draw_debug_scalar_vector_quaternion(quaternion, vector_color=0x222222, number_line_span_vec_1=[[0], [0], [1]],  number_line_width=0.01, number_line_color=0x222222, tick_dis=0.1, opacity=1.0, tail_width = 0.04) {
        this.draw_debug_vector([0,0,0], quaternion[1], tail_width, undefined, vector_color, opacity);
        this.draw_debug_number_line(quaternion[1], number_line_span_vec_1, Math.max(Math.abs(quaternion[0])*1.2, 0.3), number_line_width, number_line_color, tick_dis);

        let span_vec_normalized = normalized_matrix(number_line_span_vec_1);
        let span_vec_scaled1 = mul_matrix_scalar(span_vec_normalized, quaternion[0]);
        this.draw_debug_sphere(add_matrix_matrix(quaternion[1], span_vec_scaled1), 0.04, vector_color);
    }

    draw_debug_wxyz_quaternion(quaternion, vector_color=0x222222, number_line_span_vec_1=[[0], [0], [1]],  number_line_width=0.01, number_line_color=0x222222, tick_dis=0.1, opacity=1.0, tail_width = 0.04) {
        let q = [quaternion[0], [quaternion[1], quaternion[2], quaternion[3]]];
        this.draw_debug_scalar_vector_quaternion(q, vector_color, number_line_span_vec_1, number_line_width, number_line_color, tick_dis, opacity, tail_width);
    }

    spawn_parametric_geometry(parametric_geometry_object, slices=100, stacks=100, color=0x0000ff, opacity=1.0) {
        let geometry = new ParametricGeometry(parametric_geometry_object.get_three_parametric_function(), 200, 200);

        let material = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide });

        let mesh = new THREE.Mesh(geometry, material);
        mesh.material.transparent = true;
        mesh.material.opacity = opacity;

        this.scene.add(mesh);

        return mesh;
    }

    toggle_mesh_object_visibility(idx) {
        this.mesh_objects[idx].visible = !this.mesh_objects[idx].visible;
    }

    toggle_mesh_object_wireframe_visibility(idx) {
        this.mesh_object_wireframes[idx].visible = !this.mesh_object_wireframes[idx].visible;
    }

    set_mesh_object_visibility(idx, visible) {
        this.mesh_objects[idx].visible = visible;
    }

    set_mesh_object_wireframe_visibility(idx, visible) {
        this.mesh_object_wireframes[idx].visible = visible;
    }

    num_vertices_in_mesh_object(idx) {
        return this.get_local_vertex_positions_of_mesh_object(idx).length;
    }

    get_local_vertex_positions_of_mesh_object(idx) {
        return this.mesh_objects_local_vertex_positions[idx];
    }

    get_local_vertex_positions_of_mesh_object_wireframe(idx) {
        return this.mesh_object_wireframes_local_vertex_positions[idx];
    }

    update_vertex_positions_of_mesh_object(idx, new_vertex_positions) {
        this.#update_vertex_positions_of_generic_mesh_object(this.mesh_objects[idx], new_vertex_positions);
    }

    update_vertex_positions_of_mesh_object_wireframe(idx, new_vertex_positions) {
        this.#update_vertex_positions_of_generic_mesh_object(this.mesh_object_wireframes[idx], new_vertex_positions);
    }

    #update_vertex_positions_of_generic_mesh_object(mesh_object, new_vertex_positions) {
        let o = mesh_object.geometry.attributes.position;
        let l = o.count;
        let p = new THREE.Vector3();
        for(let i = 0; i < l; i++) {
            let vertex_position = new_vertex_positions[i];
            let vv = unroll_matrix_to_list(vertex_position);
            if (vertex_position.length > 2) {
                p.set(vv[0], vv[1], vv[2]);
            } else {
                p.set(vv[0], vv[1], 0.0001);
            }
            o.setXYZ(i, p.x, p.y, p.z);
        }
        o.needsUpdate = true;
        mesh_object.geometry.computeVertexNormals();
    }

    /*
    update_vertex_position_in_mesh_object(mesh_idx, vertex_idx, new_position) {
    let mesh = this.mesh_objects[mesh_idx];
    let wireframe_mesh = this.mesh_object_wireframes[mesh_idx];

    this.#update_vertex_position_in_mesh_object(mesh, vertex_idx, new_position);
    // this.#update_vertex_position_in_mesh_object(wireframe_mesh, vertex_idx, new_position);
}

#update_vertex_position_in_mesh_object(mesh, vertex_idx, new_position) {
    // let a = convert_z_up_array_to_y_up_array(new_position);
    let a = new_position;

    let positionAttribute = mesh.geometry.attributes.position;
    let start_idx = vertex_idx * 3;
    positionAttribute.array[start_idx] = a[0];
    positionAttribute.array[start_idx + 1] = a[1];
    if (a.length > 2) {
        positionAttribute.array[start_idx + 2] = a[2];
    }
    console.log(positionAttribute.array);
    positionAttribute.needsUpdate = true;
}

#update_vertex_position_in_mesh_object2(mesh, vertex_idx, new_position) {
    // let a = convert_z_up_array_to_y_up_array(new_position);
    let a = new_position;

    let positionAttribute = mesh.geometry.attributes.position;
    let start_idx = vertex_idx * 3;
    positionAttribute.array[start_idx] = a[0];
    positionAttribute.array[start_idx + 1] = a[1];
    if (a.length > 2) {
        positionAttribute.array[start_idx + 2] = a[2];
    }
    console.log(positionAttribute.array);
    positionAttribute.needsUpdate = true;
}
*/

    get_time_elapsed() {
        return this.clock.getElapsedTime()
    }

    get_delta_time_from_last_frame() {
        return this.clock.getDelta();
    }

    animation_loop(f) {
        const loop = () => {
            this.stats.begin();

            this.num_sphere_objects_used_on_curr_frame = 0;
            this.num_line_objects_used_on_curr_frame = 0;
            this.num_cone_objects_used_on_curr_frame = 0;
            this.num_plane_objects_used_on_curr_frame = 0;

            f();
    
            if (this.controls) {
                this.controls.update();
            }
    
            this.renderer.render(this.scene, this.camera);

            // this.line_objects.forEach((line) => {
            //     this.scene.remove(line);
            // });
            // this.line_objects = [];

            for(let i = 0; i < this.num_sphere_objects_used_on_curr_frame; i++) {this.sphere_objects[i].visible = false;}
            for(let i = 0; i < this.num_line_objects_used_on_curr_frame; i++) {this.line_objects[i].visible = false;}
            for(let i = 0; i < this.num_cone_objects_used_on_curr_frame; i++) {this.cone_objects[i].visible = false;}
            for(let i = 0; i < this.num_plane_objects_used_on_curr_frame; i++) {this.plane_objects[i].visible = false;}

            this.frame_idx++;

            this.stats.end();
            requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function threejs_responsive_canvas(camera, renderer) {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

export function load_gltf(path, scene) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(
            path,
            function(gltf) {
                if (!gltf.scene) {
                    reject('Loaded GLTF does not contain a scene.');
                    return;
                }

                let meshes = [];
                console.log(gltf.scene.traverse);
                gltf.scene.traverse(function (child) {
                    if (child.isMesh) {
                        console.log('got here');
                        const mesh = child;
                        mesh.castShadow = true;
                        // mesh.receiveShadow = true;
                        meshes.push(mesh);
                        scene.add(mesh);
                    }
                });
                if (meshes.length > 1) {
                    reject('A gltf with multiple objects is not supported by this library.');
                }
                if (meshes.length == 0) {
                    reject('This gltf did not have any meshes');
                }
                resolve(meshes[0]);
            },
            undefined,
            function (error) {
                console.error('An error happened', error);
                reject(error);
            }
        )
    });
}

export function load_gltf_safely(path, scene) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(path, (gltf) => {
            if (!gltf.scene || !(gltf.scene.children && gltf.scene.children.length)) {
                reject(new Error('Loaded GLTF does not contain a valid scene.'));
                return;
            }

            const meshes = [];
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    meshes.push(child);
                }
            });

            if (meshes.length === 0) {
                reject(new Error('No meshes found in the GLTF file.'));
                return;
            }

            // Assuming we want to add all meshes to the scene but resolve only the first
            meshes.forEach((mesh) => {
                mesh.castShadow = true;
                // Uncomment if meshes should receive shadows
                // mesh.receiveShadow = true;
                scene.add(mesh);
            });

            // Resolve with the first mesh if we're adhering to the original functionality
            // Alternatively, you could resolve with all meshes or a specific mesh based on your needs
            resolve(meshes);

        }, undefined, (error) => {
            console.error('An error occurred while loading the GLTF file:', error);
            reject(error);
        });
    });
}

export function load_stl(path, scene, wireframe=false, color=0x00ff00) {
    return new Promise((resolve, reject) => {
        const loader = new STLLoader();
        loader.load(
            path,
            function (geometry) {
                const material = new THREE.MeshStandardMaterial({ color: color, wireframe: wireframe, flatShading: false });
                const mesh = new THREE.Mesh(geometry, material);
                // mesh.receiveShadow = true;
                mesh.castShadow = true;
                // mesh.material.transparent = true;
                // mesh.material.opacity = 0.8;
                scene.add(mesh);

                resolve(mesh);  // Resolve the Promise with the loaded mesh
            },
            undefined,
            function (error) {
                console.error('An error happened', error);
                reject(error);  // Reject the Promise on error
            }
        );
    });
}

export function load_obj_from_string(scene, string, color=0x00ff00) {
    const loader = new OBJLoader();
    const object = loader.parse(string);

    let out;
    object.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
            // Extract geometry
            const geometry = child.geometry;

            // You can now use this geometry to create a new mesh with a different material
            const material = new THREE.MeshStandardMaterial({ color: color });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.material.shading = THREE.SmoothShading;

            // mesh.receiveShadow = true;
            mesh.castShadow = true;
            mesh.geometry.computeVertexNormals();

            out = mesh;
            scene.add(mesh);
        }
    });

    return out;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function spawn_line_base(scene, start_point, end_point, render_through_other_objects=false, width=0.01, color=0x0000ff, opacity=1.0) {
    let path = new THREE.LineCurve3(
        new THREE.Vector3(start_point[0], start_point[1], start_point[2]),
        new THREE.Vector3(end_point[0], end_point[1], end_point[2])
    );

    let radius = width;

    let tubeGeometry = new THREE.TubeGeometry(path, 8, radius, 8, false);
    let material = new THREE.MeshBasicMaterial({ color: color });

    let tube = new THREE.Mesh(tubeGeometry, material);

    tube.material.transparent = true;
    tube.material.opacity = opacity;

    if (render_through_other_objects) { tube.material.depthTest = false; }

    scene.add(tube);

    return tube;
}

export function spawn_line_default(scene, render_through_other_objects=false, color=0x0000ff, opacity=1.0) {
    return spawn_line_base(scene, convert_z_up_array_to_y_up_array([0,0,0]), convert_z_up_array_to_y_up_array([0,-1,0]), render_through_other_objects, 1.0, color, opacity);
}

export function spawn_line_specific(scene, start_point, end_point, render_through_other_objects=false, width=0.01, color=0x0000ff, opacity=1.0) {
    let line_object = spawn_line_default(scene, render_through_other_objects, color, opacity);

    set_line_specific(line_object, start_point, end_point, render_through_other_objects, width, color, opacity);

    return line_object;
}

export function set_line_specific(line_specific, start_point, end_point, render_through_other_objects=false, width=0.01, color=0x0000ff, opacity=1.0) {
    let y_up_end_point = convert_z_up_array_to_y_up_array(convert_2array_to_3array(unroll_matrix_to_list(end_point)));
    let a = convert_2array_to_3array(unroll_matrix_to_list(start_point));
    let b = convert_2array_to_3array(unroll_matrix_to_list(end_point));

    let a_vec = new THREE.Vector3(a[0], a[1], a[2]);
    let b_vec  = new THREE.Vector3(b[0], b[1], b[2]);
    let dis = a_vec.distanceTo(b_vec);

    line_specific.visible = true;
    line_specific.material.color.set(color);
    z_up_set_object_position(line_specific, a[0], a[1], a[2]);
    line_specific.scale.set(width,width,dis);
    line_specific.lookAt(y_up_end_point[0], y_up_end_point[1], y_up_end_point[2]);
    line_specific.material.transparent = true;
    line_specific.material.opacity = opacity;

    if (render_through_other_objects) { line_specific.material.depthTest = false; }
}

// parametric_curve_function is a function that takes in a single variable (u) on a range from 0-1
// and outputs a 3-dimensional point [x, y, z]
export function spawn_static_parametric_curve(scene, parametric_curve_function, num_points=100, render_through_other_objects=false, width=0.01, start_color=0x000000, end_color= 0x000000, opacity=1.0) {
    let stride = 1.0 / num_points;
    let curr_val = 0.0;
    let all_points = []

    while (true) {
        all_points.push(parametric_curve_function(curr_val));
        curr_val += stride;
        if (curr_val > 1.0) { break; }
    }
    all_points.push(parametric_curve_function(1.0));

    let line_objects = [];
    for (let i=0; i < all_points.length-1; i++) {
        let ratio = i / (all_points.length-1);
        let result_color = new THREE.Color();
        result_color.lerpColors(new THREE.Color( start_color ), new THREE.Color( end_color ), ratio);
        let line_object = spawn_line_specific(scene, all_points[i], all_points[i+1], render_through_other_objects, width, result_color, opacity);
        line_objects.push(line_object);
    }

    return line_objects;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function spawn_sphere_base(scene, center_point, radius, num_segments=10, color=0x00ff00, opacity=1.0, flat_material=true) {
    let geometry = new THREE.SphereGeometry(radius, num_segments, num_segments);
    let material;
    if(flat_material) {
        material = new THREE.MeshBasicMaterial({ color: color });
    } else {
        material = new THREE.MeshStandardMaterial({ color: color });
    }
    let sphere = new THREE.Mesh(geometry, material);
    sphere.position.x = center_point[0];
    sphere.position.y = center_point[1];
    sphere.position.z = center_point[2];
    sphere.material.transparent = true;
    sphere.material.opacity = opacity;
    // if (render_through_other_objects) { sphere.material.depthTest = false; }
    scene.add(sphere);

    return sphere;
}

export function spawn_sphere_default(scene, num_segments=10, color=0x00ff00, opacity=1.0, flat_material=true) {
    return spawn_sphere_base(scene, [0,0,0], 1, num_segments, color, opacity, flat_material);
}

export function spawn_sphere_specific(scene, center_point, radius, num_segments=10, color=0x00ff00, opacity=1.0, flat_material=true) {
    let sphere_object = spawn_sphere_default(scene, num_segments, color, opacity, flat_material);
    set_sphere_specific(sphere_object, center_point, radius, num_segments, color, opacity);
    return sphere_object;
}

export function set_sphere_specific(sphere_specific, center_point, radius, num_segments=10, color=0x00ff00, opacity=1.0) {
    let a = convert_2array_to_3array(unroll_matrix_to_list(center_point));
    sphere_specific.visible = true;
    sphere_specific.material.transparent = true;
    sphere_specific.material.opacity = opacity;
    sphere_specific.material.color.set(color);
    z_up_set_object_position(sphere_specific, a[0], a[1], a[2]);
    z_up_set_scale(sphere_specific, radius, radius, radius);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function spawn_cube_base(scene, center_point, width=1, height=1, depth=1, color=0x00ff00, opacity=1.0, flat_material=true) {
    let geometry = new THREE.BoxGeometry( width, height, depth );
    let material;
    if(flat_material) {
        material = new THREE.MeshBasicMaterial({ color: color });
    } else {
        material = new THREE.MeshStandardMaterial({ color: color });
    }
    let cube = new THREE.Mesh( geometry, material );
    cube.position.x = center_point[0];
    cube.position.y = center_point[1];
    cube.position.z = center_point[2];
    scene.add( cube );

    return cube;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function spawn_cone_base(scene, radius, height, radial_segments, height_segments, color=0x0000ff, opacity=1.0, flat_material=true) {
    const geometry = new THREE.ConeGeometry( radius, height, radial_segments, height_segments );
    let material;
    if(flat_material) {
        material = new THREE.MeshBasicMaterial({ color: color });
    } else {
        material = new THREE.MeshStandardMaterial({ color: color });
    }
    const cone = new THREE.Mesh(geometry, material );
    cone.material.transparent = true;
    cone.material.opacity = opacity;
    scene.add( cone );

    return cone;
}

export function spawn_cone_default(scene, color=0x0000ff, opacity=1.0, flat_material=true) {
    return spawn_cone_base(scene, 1, 1, 10, 1, color, opacity, flat_material);
}

export function spawn_cone_specific(scene, start_point, end_point, radius, color=0x0000ff, opacity=1.0, flat_material=true) {
    let cone_object = spawn_cone_default(scene, color, opacity, flat_material);
    set_cone_specific(cone_object, start_point, end_point, radius,color, opacity, flat_material);
    return cone_object;
}

export function set_cone_specific(cone_specific, start_point, end_point, radius, color=0x0000ff, opacity=1.0) {
    let aa = unroll_matrix_to_list(start_point);
    let bb = unroll_matrix_to_list(end_point);
    let a = new THREE.Vector3(aa[0], aa[1], aa[2]);
    let b = new THREE.Vector3(bb[0], bb[1], bb[2]);
    let y_up_end_point = convert_z_up_array_to_y_up_array(unroll_matrix_to_list(end_point));

    let dis = a.distanceTo(b);
    let midpoint = a.add(b).multiplyScalar(0.5);

    cone_specific.visible = true;
    cone_specific.material.color.set(color);
    cone_specific.material.transparent = true;
    cone_specific.material.opacity = opacity;
    cone_specific.scale.set(radius,dis,radius);
    z_up_set_object_position(cone_specific, midpoint.x, midpoint.y, midpoint.z);
    cone_specific.lookAt(y_up_end_point[0], y_up_end_point[1], y_up_end_point[2]);
    let quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(Math.PI/2, 0., 0.));
    cone_specific.quaternion.multiply(quaternion);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function spawn_plane_base(scene, width=1, height=1, color=0x0000ff, opacity=1.0, flat_material=true) {
    /*
    let geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        -1.0, -1.0,  0.0,  // bottom left
        1.0, -1.0,  0.0,  // bottom right
        1.0,  1.0,  0.0,  // top right
        -1.0,  1.0,  0.0   // top left
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const indices = [0, 1, 2, 2, 3, 0];
    geometry.setIndex(indices);
    */
    const geometry = new THREE.PlaneGeometry( width, height, 1, 1 );

    let material;
    if(flat_material) {
        material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    } else {
        material = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide });
    }
    const plane = new THREE.Mesh( geometry, material );
    plane.material.transparent = true;
    plane.material.opacity = opacity;
    scene.add( plane );
    return plane;
}

export function spawn_plane_default(scene, color=0x0000ff, opacity=1.0, flat_material=true) {
    return spawn_plane_base(scene, 1, 1, color, opacity, flat_material);
}

export function spawn_plane_specific(scene, center_point, span_vec_1, span_vec_2, width=1, height=1, color=0x0000ff, opacity=1.0, flat_material=true) {
    let square_object = spawn_plane_default(scene, color, opacity, flat_material);
    set_plane_specific(square_object, center_point, span_vec_1, span_vec_2, width, height, color, opacity);
    return square_object;
}

export function set_plane_specific(plane_specific, center_point, span_vec_1, span_vec_2, width=1, height=1, color=0x0000ff, opacity=1.0) {
    center_point = convert_z_up_array_to_y_up_array(convert_2array_to_3array(unroll_matrix_to_list(center_point)));
    let span_vec_1_positive = convert_z_up_array_to_y_up_array(convert_2array_to_3array(unroll_matrix_to_list(mul_matrix_scalar(normalized_matrix(span_vec_1), width))));
    let span_vec_2_positive = convert_z_up_array_to_y_up_array(convert_2array_to_3array(unroll_matrix_to_list(mul_matrix_scalar(normalized_matrix(span_vec_2), height))));
    let span_vec_1_negative = unroll_matrix_to_list(mul_matrix_scalar(span_vec_1_positive, -1.0));
    let span_vec_2_negative = unroll_matrix_to_list(mul_matrix_scalar(span_vec_2_positive, -1.0));

    let point1 = unroll_matrix_to_list(add_matrix_matrix(center_point, add_matrix_matrix(span_vec_1_positive, span_vec_2_positive)));
    let point2 = unroll_matrix_to_list(add_matrix_matrix(center_point, add_matrix_matrix(span_vec_1_positive, span_vec_2_negative)));
    let point3 = unroll_matrix_to_list(add_matrix_matrix(center_point, add_matrix_matrix(span_vec_1_negative, span_vec_2_positive)));
    let point4 = unroll_matrix_to_list(add_matrix_matrix(center_point, add_matrix_matrix(span_vec_1_negative, span_vec_2_negative)));

    let o = plane_specific.geometry.attributes.position;
    o.setXYZ(0, point1[0], point1[1], point1[2]);
    o.setXYZ(1, point2[0], point2[1], point2[2]);
    o.setXYZ(2, point3[0], point3[1], point3[2]);
    o.setXYZ(3, point4[0], point4[1], point4[2]);
    o.needsUpdate = true;

    plane_specific.visible = true;
    plane_specific.material.color.set(color);
    plane_specific.material.transparent = true;
    plane_specific.material.opacity = opacity;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function get_local_vertex_positions_of_object(object, base_quaternion, z_up=true, is2D=false) {
    let out = [];
    const positionAttribute = object.attributes.position;
    let array = positionAttribute.array;
    let v = new THREE.Vector3();
    for (let i = 0; i < array.length; i += 3) {
        let a = [array[i], array[i+1], array[i+2]];
        if (z_up) {
            a = convert_y_up_array_to_z_up_array(a);
        }

        v.fromArray([a[0], a[1], a[2]]);
        v.applyQuaternion(base_quaternion);

        if (is2D) {
            out.push( [[v.x], [v.y]] );
        } else {
            out.push( [[v.x], [v.y], [v.z]] );
        }
    }

    return out;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function z_up_set_object_position(object3D, x, y, z) {
    let a = convert_z_up_array_to_y_up_array([x,y,z]);
    if(object3D) {
        object3D.position.set(a[0], a[1], a[2]);
    }
}

export function z_up_incremental_position_object_update(object3D, delta_x, delta_y, delta_z) {
    let a = convert_z_up_array_to_y_up_array([delta_x,delta_y,delta_z]);
    object3D.position.x += a[0];
    object3D.position.y += a[1];
    object3D.position.z += a[2];
}

export function z_up_set_scale(object3D, sx, sy, sz) {
    let a = convert_z_up_array_to_y_up_array([sx,sy,sz]);
    object3D.scale.set(a[0], a[1], a[2]);
}

export function z_up_set_object_pose_from_SE3_matrix(object3D, SE3_matrix) {
    let s = SE3_matrix;
    let m = new THREE.Matrix4(s[0][0], s[0][1], s[0][2], s[0][3],
        s[1][0], s[1][1], s[1][2], s[1][3],
        s[2][0], s[2][1], s[2][2], s[2][3],
        s[3][0], s[3][1], s[3][2], s[3][3]);

    let q = new THREE.Quaternion();
    q.setFromRotationMatrix(m);
    z_up_set_object_rotation_from_quaternion(object3D, q.w, q.x, q.y, q.z);
    z_up_set_object_rotation_from_quaternion(object3D, q.w, q.x, q.y, q.z);

    z_up_set_object_position(object3D, s[0][3], s[1][3], s[2][3]);
    z_up_set_object_position(object3D, s[0][3], s[1][3], s[2][3]);
}

export function z_up_set_object_pose_from_SO3_matrix_and_position(object3D, SO3_matrix, position) {
    z_up_set_object_rotation_from_SO3_matrix(object3D, SO3_matrix);
    position = unroll_matrix_to_list(position);
    z_up_set_object_position(object3D, position[0], position[1], position[2]);
}

export function z_up_set_object_pose_from_SO2_matrix_and_position(object3D, SO2_matrix, position) {
    z_up_set_object_rotation_from_SO2_matrix(object3D, SO2_matrix);
    position = unroll_matrix_to_list(position);
    z_up_set_object_position(object3D, position[0], position[1], 0.001);
}

export function z_up_set_object_rotation_from_quaternion(object3D, w, x, y, z) {
    let a = convert_wxyz_quaternion_array_to_threejs_quaternion([w,x,y,z]);
    let b = convert_z_up_threejs_quaternion_to_y_up_threejs_quaternion(a);
    if(object3D) {
        object3D.setRotationFromQuaternion(b);
    }
}

export function z_up_set_object_rotation_from_SO3_matrix(object3D, SO3_matrix) {
    let s = SO3_matrix;
    let m = new THREE.Matrix4(
        s[0][0], s[0][1], s[0][2], 0,
        s[1][0], s[1][1], s[1][2], 0,
        s[2][0], s[2][1], s[2][2], 0,
        0, 0, 0, 1
    );

    let q = new THREE.Quaternion();
    q.setFromRotationMatrix(m);
    z_up_set_object_rotation_from_quaternion(object3D, q.w, q.x, q.y, q.z);
    // z_up_set_object_rotation_from_quaternion(object3D, q.w, q.x, q.y, q.z);
}

export function z_up_set_object_rotation_from_SO2_matrix(object3D, SO2_matrix) {
    let m = SO2_matrix;
    let mm = [[m[0][0], m[0][1], 0], [m[1][0], m[1][1], 0], [0,0,1]];
    z_up_set_object_rotation_from_SO3_matrix(object3D, mm);
}

export function z_up_set_object_rotation_from_xyz_euler_angles(object3D, rx, ry, rz) {
    let q = new THREE.Quaternion();
    q.setFromEuler( new THREE.Euler(rx, ry, rz, 'XYZ') );
    z_up_set_object_rotation_from_quaternion(object3D, q.w, q.x, q.y, q.z);
}

export function z_up_set_object_rotation_from_axis_angle(object3D, x, y, z, angle) {
    let axis = new THREE.Vector3(x, y, z);
    let q = new THREE.Quaternion();
    q.setFromAxisAngle(axis, angle);
    z_up_set_object_rotation_from_quaternion(object3D, q.w, q.x, q.y, q.z);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function z_up_get_object_position(object3D) {
    let p = [object3D.position.x, object3D.position.y, object3D.position.z];
    let a = convert_y_up_array_to_z_up_array(p);
    return [[a[0]], [a[1]], [a[2]]];
}

export function z_up_get_object_pose_as_SO3_matrix_and_position(object3D) {
    return [ z_up_get_object_rotation_as_SO3_matrix(object3D), z_up_get_object_position(object3D) ];
}

export function z_up_get_object_pose_as_SO2_matrix_and_position(object3D) {
    let res = z_up_get_object_pose_as_SO3_matrix_and_position(object3D);
    let r = res[0];
    let t = res[1];

    return [ [ [r[0][0], r[0][1]], [r[1][0], r[1][1]] ], [ [t[0][0]], [t[1][0]] ] ];
}

export function z_up_get_object_pose_as_SE3_matrix(object3D) {
    let [r, p] =  z_up_get_object_pose_as_SO3_matrix_and_position(object3D);

    return [
        [ r[0][0], r[0][1], r[0][2], p[0][0] ],
        [ r[1][0], r[1][1], r[1][2], p[1][0] ],
        [ r[2][0], r[2][1], r[2][2], p[2][0] ],
        [ 0, 0, 0, 1 ],
    ]
}

export function z_up_get_object_rotation_as_SO3_matrix(object3D) {
    let quaternion = convert_y_up_threejs_quaternion_to_z_up_threejs_quaternion(object3D.quaternion);

    let m = new THREE.Matrix4();
    m.makeRotationFromQuaternion(quaternion);

    return [
        [get_matrix4_element(m, 0, 0), get_matrix4_element(m, 0, 1), get_matrix4_element(m, 0, 2)],
        [get_matrix4_element(m, 1, 0), get_matrix4_element(m, 1, 1), get_matrix4_element(m, 1, 2)],
        [get_matrix4_element(m, 2, 0), get_matrix4_element(m, 2, 1), get_matrix4_element(m, 2, 2)]
    ];
}

export function z_up_get_object_rotation_as_wxyz_quaternion(object3D) {
    let quaternion = object3D.quaternion;
    let q = convert_y_up_threejs_quaternion_to_z_up_threejs_quaternion(quaternion);
    return convert_threejs_quaternion_to_wxyz_quaternion_array(q);
}

function get_matrix4_element(matrix, row, column) {
    const index = column * 4 + row;
    return matrix.elements[index];
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function convert_2array_to_3array(array) {
    if(array.length === 3) { return array; }
    else { return [array[0], array[1], 0.01] }
}

export function convert_array_to_threejs_vector3(array) {
    if(array.length === 2) {
        return new THREE.Vector3(array[0], array[1], 0);
    } else {
        return new THREE.Vector3(array[0], array[1], array[2]);
    }
}

export function convert_threejs_vector3_to_array(vector3) {
    return [vector3.x, vector3.y, vector3.z];
}

export function convert_wxyz_quaternion_array_to_threejs_quaternion(array) {
    let q = new THREE.Quaternion();
    q.set(array[1], array[2], array[3], array[0]);
    return q;
}

export function convert_threejs_quaternion_to_wxyz_quaternion_array(quaternion) {
    return [quaternion.w, quaternion.x, quaternion.y, quaternion.z];
}

export function convert_y_up_array_to_z_up_array(array) {
    return [array[0], -array[2], array[1]];
}

export function convert_z_up_array_to_y_up_array(array) {
    return [array[0], array[2], -array[1]]
}

export function convert_z_up_threejs_quaternion_to_y_up_threejs_quaternion(quaternion) {
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(1.,0.,0.), -Math.PI/2.0);
    let out = q.multiply(quaternion);
    return out;
}

export function convert_y_up_threejs_quaternion_to_z_up_threejs_quaternion(quaternion) {
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(1.,0.,0.), Math.PI/2.0);
    let out = q.multiply(quaternion);
    return out;
}

export function convert_threejs_matrix3_to_threejs_quaternion(matrix3) {
    var matrix4 = new THREE.Matrix4();

    matrix4.set(
        matrix3.elements[0], matrix3.elements[3], matrix3.elements[6], 0,
        matrix3.elements[1], matrix3.elements[4], matrix3.elements[7], 0,
        matrix3.elements[2], matrix3.elements[5], matrix3.elements[8], 0,
        0, 0, 0, 1
    );

    var quaternion = new THREE.Quaternion();

    quaternion.setFromRotationMatrix(matrix4);

    return quaternion
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function suzanne_monkey_obj_string() {
    return '# Blender 3.5.1\n' +
        '# www.blender.org\n' +
        'mtllib monkey.mtl\n' +
        'o Suzanne\n' +
        'v 0.765625 0.437500 0.164062\n' +
        'v 0.765625 -0.437500 0.164062\n' +
        'v 0.687500 0.500000 0.093750\n' +
        'v 0.687500 -0.500000 0.093750\n' +
        'v 0.578125 0.546875 0.054688\n' +
        'v 0.578125 -0.546875 0.054688\n' +
        'v 0.617188 0.351563 -0.023438\n' +
        'v 0.617188 -0.351562 -0.023438\n' +
        'v 0.718750 0.351563 0.031250\n' +
        'v 0.718750 -0.351562 0.031250\n' +
        'v 0.781250 0.351563 0.132812\n' +
        'v 0.781250 -0.351562 0.132812\n' +
        'v 0.796875 0.273438 0.164062\n' +
        'v 0.796875 -0.273437 0.164062\n' +
        'v 0.742188 0.203125 0.093750\n' +
        'v 0.742188 -0.203125 0.093750\n' +
        'v 0.648438 0.156250 0.054688\n' +
        'v 0.648438 -0.156250 0.054688\n' +
        'v 0.656250 0.078125 0.242188\n' +
        'v 0.656250 -0.078125 0.242188\n' +
        'v 0.742188 0.140625 0.242188\n' +
        'v 0.742188 -0.140625 0.242188\n' +
        'v 0.796875 0.242188 0.242188\n' +
        'v 0.796875 -0.242187 0.242188\n' +
        'v 0.796875 0.273438 0.328125\n' +
        'v 0.796875 -0.273437 0.328125\n' +
        'v 0.742188 0.203125 0.390625\n' +
        'v 0.742188 -0.203125 0.390625\n' +
        'v 0.648438 0.156250 0.437500\n' +
        'v 0.648438 -0.156250 0.437500\n' +
        'v 0.617188 0.351563 0.515625\n' +
        'v 0.617188 -0.351562 0.515625\n' +
        'v 0.718750 0.351563 0.453125\n' +
        'v 0.718750 -0.351562 0.453125\n' +
        'v 0.781250 0.351563 0.359375\n' +
        'v 0.781250 -0.351562 0.359375\n' +
        'v 0.765625 0.437500 0.328125\n' +
        'v 0.765625 -0.437500 0.328125\n' +
        'v 0.687500 0.500000 0.390625\n' +
        'v 0.687500 -0.500000 0.390625\n' +
        'v 0.578125 0.546875 0.437500\n' +
        'v 0.578125 -0.546875 0.437500\n' +
        'v 0.562500 0.625000 0.242188\n' +
        'v 0.562500 -0.625000 0.242188\n' +
        'v 0.671875 0.562500 0.242188\n' +
        'v 0.671875 -0.562500 0.242188\n' +
        'v 0.757812 0.468750 0.242188\n' +
        'v 0.757812 -0.468750 0.242188\n' +
        'v 0.773438 0.476563 0.242188\n' +
        'v 0.773438 -0.476562 0.242188\n' +
        'v 0.781250 0.445313 0.335938\n' +
        'v 0.781250 -0.445312 0.335938\n' +
        'v 0.804688 0.351563 0.375000\n' +
        'v 0.804688 -0.351562 0.375000\n' +
        'v 0.820312 0.265625 0.335938\n' +
        'v 0.820312 -0.265625 0.335938\n' +
        'v 0.820312 0.226563 0.242188\n' +
        'v 0.820312 -0.226562 0.242188\n' +
        'v 0.820312 0.265625 0.156250\n' +
        'v 0.820312 -0.265625 0.156250\n' +
        'v 0.828125 0.351563 0.242188\n' +
        'v 0.828125 -0.351562 0.242188\n' +
        'v 0.804688 0.351563 0.117188\n' +
        'v 0.804688 -0.351562 0.117188\n' +
        'v 0.781250 0.445313 0.156250\n' +
        'v 0.781250 -0.445312 0.156250\n' +
        'v 0.742188 0.000000 0.429688\n' +
        'v 0.820312 0.000000 0.351562\n' +
        'v 0.734375 0.000000 -0.679688\n' +
        'v 0.781250 0.000000 -0.320312\n' +
        'v 0.796875 0.000000 -0.187500\n' +
        'v 0.718750 0.000000 -0.773438\n' +
        'v 0.601562 0.000000 0.406250\n' +
        'v 0.570312 0.000000 0.570312\n' +
        'v -0.546875 -0.000000 0.898438\n' +
        'v -0.851562 -0.000000 0.562500\n' +
        'v -0.828125 -0.000000 0.070312\n' +
        'v -0.351562 -0.000000 -0.382812\n' +
        'v 0.562500 0.203125 -0.187500\n' +
        'v 0.562500 -0.203125 -0.187500\n' +
        'v 0.570312 0.312500 -0.437500\n' +
        'v 0.570312 -0.312500 -0.437500\n' +
        'v 0.570312 0.351563 -0.695312\n' +
        'v 0.570312 -0.351562 -0.695312\n' +
        'v 0.531250 0.367188 -0.890625\n' +
        'v 0.531250 -0.367187 -0.890625\n' +
        'v 0.523438 0.328125 -0.945312\n' +
        'v 0.523438 -0.328125 -0.945312\n' +
        'v 0.554688 0.179688 -0.968750\n' +
        'v 0.554688 -0.179687 -0.968750\n' +
        'v 0.578125 0.000000 -0.984375\n' +
        'v 0.531250 0.437500 -0.140625\n' +
        'v 0.531250 -0.437500 -0.140625\n' +
        'v 0.539062 0.632812 -0.039062\n' +
        'v 0.539062 -0.632812 -0.039062\n' +
        'v 0.445312 0.828125 0.148438\n' +
        'v 0.445313 -0.828125 0.148438\n' +
        'v 0.593750 0.859375 0.429688\n' +
        'v 0.593750 -0.859375 0.429688\n' +
        'v 0.625000 0.710938 0.484375\n' +
        'v 0.625000 -0.710938 0.484375\n' +
        'v 0.687500 0.492188 0.601562\n' +
        'v 0.687500 -0.492187 0.601562\n' +
        'v 0.734375 0.320313 0.757812\n' +
        'v 0.734375 -0.320312 0.757812\n' +
        'v 0.757812 0.156250 0.718750\n' +
        'v 0.757812 -0.156250 0.718750\n' +
        'v 0.750000 0.062500 0.492188\n' +
        'v 0.750000 -0.062500 0.492188\n' +
        'v 0.773438 0.164063 0.414062\n' +
        'v 0.773438 -0.164062 0.414062\n' +
        'v 0.765625 0.125000 0.304688\n' +
        'v 0.765625 -0.125000 0.304688\n' +
        'v 0.742188 0.203125 0.093750\n' +
        'v 0.742188 -0.203125 0.093750\n' +
        'v 0.703125 0.375000 0.015625\n' +
        'v 0.703125 -0.375000 0.015625\n' +
        'v 0.671875 0.492188 0.062500\n' +
        'v 0.671875 -0.492187 0.062500\n' +
        'v 0.648438 0.625000 0.187500\n' +
        'v 0.648438 -0.625000 0.187500\n' +
        'v 0.648438 0.640625 0.296875\n' +
        'v 0.648438 -0.640625 0.296875\n' +
        'v 0.664062 0.601562 0.375000\n' +
        'v 0.664062 -0.601562 0.375000\n' +
        'v 0.718750 0.429688 0.437500\n' +
        'v 0.718750 -0.429687 0.437500\n' +
        'v 0.757812 0.250000 0.468750\n' +
        'v 0.757812 -0.250000 0.468750\n' +
        'v 0.734375 0.000000 -0.765625\n' +
        'v 0.734375 0.109375 -0.718750\n' +
        'v 0.734375 -0.109375 -0.718750\n' +
        'v 0.710938 0.117188 -0.835938\n' +
        'v 0.710938 -0.117187 -0.835938\n' +
        'v 0.695312 0.062500 -0.882812\n' +
        'v 0.695312 -0.062500 -0.882812\n' +
        'v 0.687500 0.000000 -0.890625\n' +
        'v 0.750000 0.000000 -0.195312\n' +
        'v 0.742188 0.000000 -0.140625\n' +
        'v 0.742188 0.101563 -0.148438\n' +
        'v 0.742188 -0.101562 -0.148438\n' +
        'v 0.750000 0.125000 -0.226562\n' +
        'v 0.750000 -0.125000 -0.226562\n' +
        'v 0.742188 0.085938 -0.289062\n' +
        'v 0.742188 -0.085937 -0.289062\n' +
        'v 0.671875 0.398438 -0.046875\n' +
        'v 0.671875 -0.398437 -0.046875\n' +
        'v 0.625000 0.617188 0.054688\n' +
        'v 0.625000 -0.617188 0.054688\n' +
        'v 0.601562 0.726562 0.203125\n' +
        'v 0.601563 -0.726562 0.203125\n' +
        'v 0.656250 0.742188 0.375000\n' +
        'v 0.656250 -0.742188 0.375000\n' +
        'v 0.726562 0.687500 0.414062\n' +
        'v 0.726563 -0.687500 0.414062\n' +
        'v 0.796875 0.437500 0.546875\n' +
        'v 0.796875 -0.437500 0.546875\n' +
        'v 0.835938 0.312500 0.640625\n' +
        'v 0.835938 -0.312500 0.640625\n' +
        'v 0.851562 0.203125 0.617188\n' +
        'v 0.851562 -0.203125 0.617188\n' +
        'v 0.843750 0.101563 0.429688\n' +
        'v 0.843750 -0.101562 0.429688\n' +
        'v 0.812500 0.125000 -0.101562\n' +
        'v 0.812500 -0.125000 -0.101562\n' +
        'v 0.710938 0.210938 -0.445312\n' +
        'v 0.710938 -0.210937 -0.445312\n' +
        'v 0.687500 0.250000 -0.703125\n' +
        'v 0.687500 -0.250000 -0.703125\n' +
        'v 0.664062 0.265625 -0.820312\n' +
        'v 0.664062 -0.265625 -0.820312\n' +
        'v 0.632812 0.234375 -0.914062\n' +
        'v 0.632812 -0.234375 -0.914062\n' +
        'v 0.632812 0.164063 -0.929688\n' +
        'v 0.632812 -0.164062 -0.929688\n' +
        'v 0.640625 0.000000 -0.945312\n' +
        'v 0.726562 0.000000 0.046875\n' +
        'v 0.765625 0.000000 0.210938\n' +
        'v 0.742188 0.328125 0.476562\n' +
        'v 0.742188 -0.328125 0.476562\n' +
        'v 0.750000 0.164063 0.140625\n' +
        'v 0.750000 -0.164062 0.140625\n' +
        'v 0.757812 0.132813 0.210938\n' +
        'v 0.757812 -0.132812 0.210938\n' +
        'v 0.734375 0.117188 -0.687500\n' +
        'v 0.734375 -0.117187 -0.687500\n' +
        'v 0.750000 0.078125 -0.445312\n' +
        'v 0.750000 -0.078125 -0.445312\n' +
        'v 0.750000 0.000000 -0.445312\n' +
        'v 0.742188 0.000000 -0.328125\n' +
        'v 0.781250 0.093750 -0.273438\n' +
        'v 0.781250 -0.093750 -0.273438\n' +
        'v 0.796875 0.132813 -0.226562\n' +
        'v 0.796875 -0.132812 -0.226562\n' +
        'v 0.781250 0.109375 -0.132812\n' +
        'v 0.781250 -0.109375 -0.132812\n' +
        'v 0.781250 0.039063 -0.125000\n' +
        'v 0.781250 -0.039062 -0.125000\n' +
        'v 0.828125 0.000000 -0.203125\n' +
        'v 0.812500 0.046875 -0.148438\n' +
        'v 0.812500 -0.046875 -0.148438\n' +
        'v 0.812500 0.093750 -0.156250\n' +
        'v 0.812500 -0.093750 -0.156250\n' +
        'v 0.828125 0.109375 -0.226562\n' +
        'v 0.828125 -0.109375 -0.226562\n' +
        'v 0.804688 0.078125 -0.250000\n' +
        'v 0.804688 -0.078125 -0.250000\n' +
        'v 0.804688 0.000000 -0.289062\n' +
        'v 0.554688 0.257813 -0.312500\n' +
        'v 0.554688 -0.257812 -0.312500\n' +
        'v 0.710938 0.164063 -0.242188\n' +
        'v 0.710938 -0.164062 -0.242188\n' +
        'v 0.710938 0.179688 -0.312500\n' +
        'v 0.710938 -0.179687 -0.312500\n' +
        'v 0.554688 0.234375 -0.250000\n' +
        'v 0.554688 -0.234375 -0.250000\n' +
        'v 0.687500 0.000000 -0.875000\n' +
        'v 0.687500 0.046875 -0.867188\n' +
        'v 0.687500 -0.046875 -0.867188\n' +
        'v 0.710938 0.093750 -0.820312\n' +
        'v 0.710938 -0.093750 -0.820312\n' +
        'v 0.726562 0.093750 -0.742188\n' +
        'v 0.726562 -0.093750 -0.742188\n' +
        'v 0.656250 0.000000 -0.781250\n' +
        'v 0.664062 0.093750 -0.750000\n' +
        'v 0.664062 -0.093750 -0.750000\n' +
        'v 0.640625 0.093750 -0.812500\n' +
        'v 0.640625 -0.093750 -0.812500\n' +
        'v 0.632812 0.046875 -0.851562\n' +
        'v 0.632812 -0.046875 -0.851562\n' +
        'v 0.632812 0.000000 -0.859375\n' +
        'v 0.781250 0.171875 0.218750\n' +
        'v 0.781250 -0.171875 0.218750\n' +
        'v 0.773438 0.187500 0.156250\n' +
        'v 0.773438 -0.187500 0.156250\n' +
        'v 0.757812 0.335938 0.429688\n' +
        'v 0.757812 -0.335937 0.429688\n' +
        'v 0.773438 0.273438 0.421875\n' +
        'v 0.773438 -0.273437 0.421875\n' +
        'v 0.773438 0.421875 0.398438\n' +
        'v 0.773438 -0.421875 0.398438\n' +
        'v 0.695312 0.562500 0.351562\n' +
        'v 0.695312 -0.562500 0.351562\n' +
        'v 0.687500 0.585938 0.289062\n' +
        'v 0.687500 -0.585937 0.289062\n' +
        'v 0.679688 0.578125 0.195312\n' +
        'v 0.679688 -0.578125 0.195312\n' +
        'v 0.718750 0.476563 0.101562\n' +
        'v 0.718750 -0.476562 0.101562\n' +
        'v 0.742188 0.375000 0.062500\n' +
        'v 0.742188 -0.375000 0.062500\n' +
        'v 0.781250 0.226563 0.109375\n' +
        'v 0.781250 -0.226562 0.109375\n' +
        'v 0.781250 0.179688 0.296875\n' +
        'v 0.781250 -0.179687 0.296875\n' +
        'v 0.781250 0.210938 0.375000\n' +
        'v 0.781250 -0.210937 0.375000\n' +
        'v 0.757812 0.234375 0.359375\n' +
        'v 0.757812 -0.234375 0.359375\n' +
        'v 0.757812 0.195313 0.296875\n' +
        'v 0.757812 -0.195312 0.296875\n' +
        'v 0.757812 0.242188 0.125000\n' +
        'v 0.757812 -0.242187 0.125000\n' +
        'v 0.726562 0.375000 0.085938\n' +
        'v 0.726562 -0.375000 0.085938\n' +
        'v 0.703125 0.460938 0.117188\n' +
        'v 0.703125 -0.460937 0.117188\n' +
        'v 0.671875 0.546875 0.210938\n' +
        'v 0.671875 -0.546875 0.210938\n' +
        'v 0.671875 0.554688 0.281250\n' +
        'v 0.671875 -0.554688 0.281250\n' +
        'v 0.679688 0.531250 0.335938\n' +
        'v 0.679688 -0.531250 0.335938\n' +
        'v 0.750000 0.414063 0.390625\n' +
        'v 0.750000 -0.414062 0.390625\n' +
        'v 0.765625 0.281250 0.398438\n' +
        'v 0.765625 -0.281250 0.398438\n' +
        'v 0.750000 0.335938 0.406250\n' +
        'v 0.750000 -0.335937 0.406250\n' +
        'v 0.750000 0.203125 0.171875\n' +
        'v 0.750000 -0.203125 0.171875\n' +
        'v 0.750000 0.195313 0.226562\n' +
        'v 0.750000 -0.195312 0.226562\n' +
        'v 0.609375 0.109375 0.460938\n' +
        'v 0.609375 -0.109375 0.460938\n' +
        'v 0.617188 0.195313 0.664062\n' +
        'v 0.617188 -0.195312 0.664062\n' +
        'v 0.593750 0.335938 0.687500\n' +
        'v 0.593750 -0.335937 0.687500\n' +
        'v 0.554688 0.484375 0.554688\n' +
        'v 0.554688 -0.484375 0.554688\n' +
        'v 0.492187 0.679688 0.453125\n' +
        'v 0.492188 -0.679688 0.453125\n' +
        'v 0.460937 0.796875 0.406250\n' +
        'v 0.460938 -0.796875 0.406250\n' +
        'v 0.375000 0.773438 0.164062\n' +
        'v 0.375000 -0.773438 0.164062\n' +
        'v 0.414062 0.601562 0.000000\n' +
        'v 0.414063 -0.601562 0.000000\n' +
        'v 0.468750 0.437500 -0.093750\n' +
        'v 0.468750 -0.437500 -0.093750\n' +
        'v 0.289062 0.000000 0.898438\n' +
        'v -0.078125 -0.000000 0.984375\n' +
        'v -0.671875 -0.000000 -0.195312\n' +
        'v 0.187500 0.000000 -0.460938\n' +
        'v 0.460938 0.000000 -0.976562\n' +
        'v 0.343750 0.000000 -0.804688\n' +
        'v 0.320312 0.000000 -0.570312\n' +
        'v 0.281250 0.000000 -0.484375\n' +
        'v 0.054687 0.851562 0.234375\n' +
        'v 0.054688 -0.851562 0.234375\n' +
        'v -0.046875 0.859375 0.320312\n' +
        'v -0.046875 -0.859375 0.320312\n' +
        'v -0.437500 0.773438 0.265625\n' +
        'v -0.437500 -0.773438 0.265625\n' +
        'v -0.703125 0.460937 0.437500\n' +
        'v -0.703125 -0.460938 0.437500\n' +
        'v 0.070312 0.734375 -0.046875\n' +
        'v 0.070313 -0.734375 -0.046875\n' +
        'v -0.164063 0.593750 -0.125000\n' +
        'v -0.164062 -0.593750 -0.125000\n' +
        'v -0.429688 0.640625 -0.007812\n' +
        'v -0.429687 -0.640625 -0.007812\n' +
        'v -0.664062 0.335937 0.054688\n' +
        'v -0.664062 -0.335938 0.054688\n' +
        'v 0.406250 0.234375 -0.351562\n' +
        'v 0.406250 -0.234375 -0.351562\n' +
        'v 0.257812 0.179688 -0.414062\n' +
        'v 0.257812 -0.179687 -0.414062\n' +
        'v 0.382812 0.289063 -0.710938\n' +
        'v 0.382812 -0.289062 -0.710938\n' +
        'v 0.390625 0.250000 -0.500000\n' +
        'v 0.390625 -0.250000 -0.500000\n' +
        'v 0.398438 0.328125 -0.914062\n' +
        'v 0.398438 -0.328125 -0.914062\n' +
        'v 0.367188 0.140625 -0.757812\n' +
        'v 0.367188 -0.140625 -0.757812\n' +
        'v 0.359375 0.125000 -0.539062\n' +
        'v 0.359375 -0.125000 -0.539062\n' +
        'v 0.437500 0.164063 -0.945312\n' +
        'v 0.437500 -0.164062 -0.945312\n' +
        'v 0.429688 0.218750 -0.281250\n' +
        'v 0.429688 -0.218750 -0.281250\n' +
        'v 0.468750 0.210938 -0.226562\n' +
        'v 0.468750 -0.210937 -0.226562\n' +
        'v 0.500000 0.203125 -0.171875\n' +
        'v 0.500000 -0.203125 -0.171875\n' +
        'v 0.164062 0.210938 -0.390625\n' +
        'v 0.164063 -0.210938 -0.390625\n' +
        'v -0.265625 0.296875 -0.312500\n' +
        'v -0.265625 -0.296875 -0.312500\n' +
        'v -0.539062 0.343750 -0.148438\n' +
        'v -0.539062 -0.343750 -0.148438\n' +
        'v -0.382813 0.453125 0.867188\n' +
        'v -0.382812 -0.453125 0.867188\n' +
        'v -0.070313 0.453125 0.929688\n' +
        'v -0.070312 -0.453125 0.929688\n' +
        'v 0.234375 0.453125 0.851562\n' +
        'v 0.234375 -0.453125 0.851562\n' +
        'v 0.429687 0.460938 0.523438\n' +
        'v 0.429688 -0.460937 0.523438\n' +
        'v 0.335937 0.726562 0.406250\n' +
        'v 0.335938 -0.726562 0.406250\n' +
        'v 0.281250 0.632812 0.453125\n' +
        'v 0.281250 -0.632812 0.453125\n' +
        'v 0.054687 0.640625 0.703125\n' +
        'v 0.054688 -0.640625 0.703125\n' +
        'v 0.125000 0.796875 0.562500\n' +
        'v 0.125000 -0.796875 0.562500\n' +
        'v -0.117188 0.796875 0.617188\n' +
        'v -0.117187 -0.796875 0.617188\n' +
        'v -0.195313 0.640625 0.750000\n' +
        'v -0.195312 -0.640625 0.750000\n' +
        'v -0.445313 0.640625 0.679688\n' +
        'v -0.445312 -0.640625 0.679688\n' +
        'v -0.359375 0.796875 0.539062\n' +
        'v -0.359375 -0.796875 0.539062\n' +
        'v -0.585938 0.617188 0.328125\n' +
        'v -0.585938 -0.617188 0.328125\n' +
        'v -0.546875 0.484375 0.023438\n' +
        'v -0.546875 -0.484375 0.023438\n' +
        'v -0.203125 0.820312 0.328125\n' +
        'v -0.203125 -0.820312 0.328125\n' +
        'v 0.148437 0.406250 -0.171875\n' +
        'v 0.148438 -0.406250 -0.171875\n' +
        'v -0.210938 0.429688 -0.195312\n' +
        'v -0.210937 -0.429688 -0.195312\n' +
        'v -0.234375 0.890625 0.406250\n' +
        'v -0.234375 -0.890625 0.406250\n' +
        'v -0.125000 0.773438 -0.140625\n' +
        'v -0.125000 -0.773438 -0.140625\n' +
        'v -0.328125 1.039062 -0.101562\n' +
        'v -0.328125 -1.039062 -0.101562\n' +
        'v -0.429688 1.281250 0.054688\n' +
        'v -0.429687 -1.281250 0.054688\n' +
        'v -0.421875 1.351562 0.320312\n' +
        'v -0.421875 -1.351562 0.320312\n' +
        'v -0.421875 1.234375 0.507812\n' +
        'v -0.421875 -1.234375 0.507812\n' +
        'v -0.312500 1.023438 0.476562\n' +
        'v -0.312500 -1.023438 0.476562\n' +
        'v -0.289063 1.015625 0.414062\n' +
        'v -0.289062 -1.015625 0.414062\n' +
        'v -0.390625 1.187500 0.437500\n' +
        'v -0.390625 -1.187500 0.437500\n' +
        'v -0.406250 1.265625 0.289062\n' +
        'v -0.406250 -1.265625 0.289062\n' +
        'v -0.406250 1.210938 0.078125\n' +
        'v -0.406250 -1.210938 0.078125\n' +
        'v -0.304688 1.031250 -0.039062\n' +
        'v -0.304687 -1.031250 -0.039062\n' +
        'v -0.132813 0.828125 -0.070312\n' +
        'v -0.132812 -0.828125 -0.070312\n' +
        'v -0.218750 0.921875 0.359375\n' +
        'v -0.218750 -0.921875 0.359375\n' +
        'v -0.289063 0.945312 0.304688\n' +
        'v -0.289062 -0.945312 0.304688\n' +
        'v -0.210938 0.882812 -0.023438\n' +
        'v -0.210937 -0.882812 -0.023438\n' +
        'v -0.367188 1.039062 0.000000\n' +
        'v -0.367187 -1.039062 0.000000\n' +
        'v -0.445313 1.187500 0.093750\n' +
        'v -0.445312 -1.187500 0.093750\n' +
        'v -0.445313 1.234375 0.250000\n' +
        'v -0.445312 -1.234375 0.250000\n' +
        'v -0.437500 1.171875 0.359375\n' +
        'v -0.437500 -1.171875 0.359375\n' +
        'v -0.359375 1.023438 0.343750\n' +
        'v -0.359375 -1.023438 0.343750\n' +
        'v -0.210938 0.843750 0.289062\n' +
        'v -0.210937 -0.843750 0.289062\n' +
        'v -0.273438 0.835938 0.171875\n' +
        'v -0.273437 -0.835938 0.171875\n' +
        'v -0.273438 0.757812 0.093750\n' +
        'v -0.273437 -0.757812 0.093750\n' +
        'v -0.273438 0.820312 0.085938\n' +
        'v -0.273437 -0.820312 0.085938\n' +
        'v -0.273438 0.843750 0.015625\n' +
        'v -0.273437 -0.843750 0.015625\n' +
        'v -0.273438 0.812500 -0.015625\n' +
        'v -0.273437 -0.812500 -0.015625\n' +
        'v -0.070313 0.726562 0.000000\n' +
        'v -0.070312 -0.726562 0.000000\n' +
        'v -0.171875 0.718750 -0.023438\n' +
        'v -0.171875 -0.718750 -0.023438\n' +
        'v -0.187500 0.718750 0.039062\n' +
        'v -0.187500 -0.718750 0.039062\n' +
        'v -0.210938 0.796875 0.203125\n' +
        'v -0.210937 -0.796875 0.203125\n' +
        'v -0.265625 0.890625 0.242188\n' +
        'v -0.265625 -0.890625 0.242188\n' +
        'v -0.320313 0.890625 0.234375\n' +
        'v -0.320312 -0.890625 0.234375\n' +
        'v -0.320313 0.812500 -0.015625\n' +
        'v -0.320312 -0.812500 -0.015625\n' +
        'v -0.320313 0.851562 0.015625\n' +
        'v -0.320312 -0.851562 0.015625\n' +
        'v -0.320313 0.828125 0.078125\n' +
        'v -0.320312 -0.828125 0.078125\n' +
        'v -0.320313 0.765625 0.093750\n' +
        'v -0.320312 -0.765625 0.093750\n' +
        'v -0.320313 0.843750 0.171875\n' +
        'v -0.320312 -0.843750 0.171875\n' +
        'v -0.414063 1.039062 0.328125\n' +
        'v -0.414062 -1.039062 0.328125\n' +
        'v -0.484375 1.187500 0.343750\n' +
        'v -0.484375 -1.187500 0.343750\n' +
        'v -0.492188 1.257812 0.242188\n' +
        'v -0.492187 -1.257812 0.242188\n' +
        'v -0.484375 1.210938 0.085938\n' +
        'v -0.484375 -1.210938 0.085938\n' +
        'v -0.421875 1.046875 0.000000\n' +
        'v -0.421875 -1.046875 0.000000\n' +
        'v -0.265625 0.882812 -0.015625\n' +
        'v -0.265625 -0.882812 -0.015625\n' +
        'v -0.343750 0.953125 0.289062\n' +
        'v -0.343750 -0.953125 0.289062\n' +
        'v -0.328125 0.890625 0.109375\n' +
        'v -0.328125 -0.890625 0.109375\n' +
        'v -0.335938 0.937500 0.062500\n' +
        'v -0.335937 -0.937500 0.062500\n' +
        'v -0.367188 1.000000 0.125000\n' +
        'v -0.367187 -1.000000 0.125000\n' +
        'v -0.351563 0.960938 0.171875\n' +
        'v -0.351562 -0.960938 0.171875\n' +
        'v -0.375000 1.015625 0.234375\n' +
        'v -0.375000 -1.015625 0.234375\n' +
        'v -0.382813 1.054688 0.187500\n' +
        'v -0.382812 -1.054688 0.187500\n' +
        'v -0.390625 1.109375 0.210938\n' +
        'v -0.390625 -1.109375 0.210938\n' +
        'v -0.390625 1.085938 0.273438\n' +
        'v -0.390625 -1.085938 0.273438\n' +
        'v -0.484375 1.023438 0.437500\n' +
        'v -0.484375 -1.023438 0.437500\n' +
        'v -0.546875 1.250000 0.468750\n' +
        'v -0.546875 -1.250000 0.468750\n' +
        'v -0.500000 1.367188 0.296875\n' +
        'v -0.500000 -1.367188 0.296875\n' +
        'v -0.531250 1.312500 0.054688\n' +
        'v -0.531250 -1.312500 0.054688\n' +
        'v -0.492188 1.039062 -0.085938\n' +
        'v -0.492187 -1.039062 -0.085938\n' +
        'v -0.328125 0.789062 -0.125000\n' +
        'v -0.328125 -0.789062 -0.125000\n' +
        'v -0.382813 0.859375 0.382812\n' +
        'v -0.382812 -0.859375 0.382812\n' +
        'vn 0.7194 0.6650 -0.2008\n' +
        'vn 0.7194 -0.6650 -0.2008\n' +
        'vn 0.4689 0.8294 -0.3036\n' +
        'vn 0.4689 -0.8294 -0.3036\n' +
        'vn 0.4449 0.4155 -0.7933\n' +
        'vn 0.4449 -0.4155 -0.7933\n' +
        'vn 0.7820 0.3599 -0.5089\n' +
        'vn 0.7820 -0.3600 -0.5089\n' +
        'vn 0.8384 -0.0787 -0.5394\n' +
        'vn 0.8384 0.0787 -0.5394\n' +
        'vn 0.4685 -0.2696 -0.8413\n' +
        'vn 0.4685 0.2696 -0.8413\n' +
        'vn 0.5420 -0.7707 -0.3352\n' +
        'vn 0.5420 0.7707 -0.3352\n' +
        'vn 0.8617 -0.4689 -0.1940\n' +
        'vn 0.8617 0.4689 -0.1940\n' +
        'vn 0.8581 -0.4767 0.1907\n' +
        'vn 0.8581 0.4767 0.1907\n' +
        'vn 0.5521 -0.7672 0.3264\n' +
        'vn 0.5521 0.7672 0.3264\n' +
        'vn 0.5182 -0.2519 0.8173\n' +
        'vn 0.5182 0.2519 0.8173\n' +
        'vn 0.8164 -0.0949 0.5696\n' +
        'vn 0.8164 0.0949 0.5696\n' +
        'vn 0.7597 0.3667 0.5370\n' +
        'vn 0.7597 -0.3667 0.5370\n' +
        'vn 0.4898 0.4141 0.7672\n' +
        'vn 0.4898 -0.4141 0.7672\n' +
        'vn 0.4771 0.8277 0.2952\n' +
        'vn 0.4771 -0.8277 0.2952\n' +
        'vn 0.7145 0.6713 0.1971\n' +
        'vn 0.7145 -0.6713 0.1971\n' +
        'vn -0.4867 0.8111 0.3244\n' +
        'vn -0.4867 -0.8111 0.3244\n' +
        'vn -0.5334 0.2052 0.8206\n' +
        'vn -0.5334 -0.2052 0.8206\n' +
        'vn -0.4607 -0.4223 0.7806\n' +
        'vn -0.4607 0.4223 0.7806\n' +
        'vn -0.4658 -0.8241 0.3225\n' +
        'vn -0.4658 0.8241 0.3225\n' +
        'vn -0.4650 -0.8137 -0.3487\n' +
        'vn -0.4650 0.8137 -0.3487\n' +
        'vn -0.4607 -0.4223 -0.7806\n' +
        'vn -0.4607 0.4223 -0.7806\n' +
        'vn -0.5334 0.2052 -0.8206\n' +
        'vn -0.5334 -0.2052 -0.8206\n' +
        'vn -0.4875 0.7995 -0.3510\n' +
        'vn -0.4875 -0.7995 -0.3510\n' +
        'vn 0.9144 0.4000 -0.0623\n' +
        'vn 0.9144 -0.4000 -0.0623\n' +
        'vn 0.9354 0.3069 -0.1754\n' +
        'vn 0.9354 -0.3069 -0.1754\n' +
        'vn 0.9785 0.0945 -0.1835\n' +
        'vn 0.9785 -0.0945 -0.1835\n' +
        'vn 0.9977 -0.0624 -0.0283\n' +
        'vn 0.9977 0.0624 -0.0283\n' +
        'vn 0.9977 -0.0624 0.0260\n' +
        'vn 0.9977 0.0624 0.0260\n' +
        'vn 0.9799 0.0996 0.1729\n' +
        'vn 0.9799 -0.0996 0.1729\n' +
        'vn 0.9383 0.3036 0.1656\n' +
        'vn 0.9383 -0.3036 0.1656\n' +
        'vn 0.9147 0.4002 0.0572\n' +
        'vn 0.9147 -0.4002 0.0572\n' +
        'vn 0.4924 0.1231 -0.8616\n' +
        'vn 0.4924 -0.1231 -0.8616\n' +
        'vn 0.4520 0.2190 -0.8647\n' +
        'vn 0.4520 -0.2190 -0.8647\n' +
        'vn 0.6668 0.5902 -0.4550\n' +
        'vn 0.6668 -0.5902 -0.4550\n' +
        'vn 0.6374 0.7689 -0.0506\n' +
        'vn 0.6374 -0.7689 -0.0506\n' +
        'vn 0.6197 0.7796 0.0900\n' +
        'vn 0.6197 -0.7796 0.0900\n' +
        'vn 0.4739 0.3241 -0.8188\n' +
        'vn 0.4739 -0.3241 -0.8188\n' +
        'vn 0.6417 0.3857 -0.6629\n' +
        'vn 0.6417 -0.3857 -0.6629\n' +
        'vn 0.5906 0.6895 -0.4193\n' +
        'vn 0.5906 -0.6895 -0.4193\n' +
        'vn 0.6588 0.6588 -0.3634\n' +
        'vn 0.6588 -0.6588 -0.3634\n' +
        'vn 0.7509 0.5465 0.3707\n' +
        'vn 0.7509 -0.5465 0.3707\n' +
        'vn 0.5706 0.5064 0.6464\n' +
        'vn 0.5706 -0.5064 0.6464\n' +
        'vn 0.6015 0.6092 0.5167\n' +
        'vn 0.6015 -0.6092 0.5167\n' +
        'vn 0.7491 -0.0441 0.6610\n' +
        'vn 0.7491 0.0441 0.6610\n' +
        'vn 0.6110 -0.7246 0.3187\n' +
        'vn 0.6110 0.7246 0.3187\n' +
        'vn 0.5880 -0.5880 0.5554\n' +
        'vn 0.5880 0.5880 0.5554\n' +
        'vn 0.7482 0.5361 -0.3909\n' +
        'vn 0.7482 -0.5361 -0.3909\n' +
        'vn 0.8552 0.2207 -0.4690\n' +
        'vn 0.8552 -0.2207 -0.4690\n' +
        'vn 0.8429 -0.0794 -0.5321\n' +
        'vn 0.8429 0.0794 -0.5321\n' +
        'vn 0.7490 -0.0825 -0.6575\n' +
        'vn 0.7490 0.0825 -0.6575\n' +
        'vn 0.8226 0.0457 -0.5667\n' +
        'vn 0.8226 -0.0457 -0.5667\n' +
        'vn 0.9365 0.2784 -0.2130\n' +
        'vn 0.9365 -0.2784 -0.2130\n' +
        'vn 0.9063 0.3813 -0.1824\n' +
        'vn 0.9063 -0.3813 -0.1824\n' +
        'vn 0.8969 0.3357 -0.2878\n' +
        'vn 0.8969 -0.3357 -0.2878\n' +
        'vn 0.9246 0.3762 0.0603\n' +
        'vn 0.9246 -0.3762 0.0603\n' +
        'vn 0.9539 -0.1352 0.2680\n' +
        'vn 0.9539 0.1352 0.2680\n' +
        'vn 0.8102 0.3961 -0.4321\n' +
        'vn 0.8102 -0.3961 -0.4321\n' +
        'vn 0.9510 0.1856 -0.2474\n' +
        'vn 0.9510 -0.1856 -0.2474\n' +
        'vn 0.9808 0.0099 -0.1948\n' +
        'vn 0.9808 -0.0099 -0.1948\n' +
        'vn 0.7138 0.0721 -0.6966\n' +
        'vn 0.7138 -0.0721 -0.6966\n' +
        'vn 0.7986 0.1863 -0.5723\n' +
        'vn 0.7986 -0.1863 -0.5723\n' +
        'vn 0.9094 0.3157 -0.2708\n' +
        'vn 0.9094 -0.3157 -0.2708\n' +
        'vn 0.9516 0.3063 -0.0265\n' +
        'vn 0.9516 -0.3063 -0.0265\n' +
        'vn 0.9361 0.3266 -0.1306\n' +
        'vn 0.9361 -0.3266 -0.1306\n' +
        'vn 0.9983 -0.0137 0.0574\n' +
        'vn 0.9983 0.0137 0.0574\n' +
        'vn 0.9978 -0.0026 -0.0656\n' +
        'vn 0.9978 0.0026 -0.0656\n' +
        'vn 1.0000 -0.0000 -0.0000\n' +
        'vn -0.0442 0.8174 -0.5744\n' +
        'vn -0.0442 -0.8174 -0.5744\n' +
        'vn -0.2144 0.9494 0.2297\n' +
        'vn -0.2144 -0.9494 0.2297\n' +
        'vn -0.4124 0.0825 0.9073\n' +
        'vn -0.4124 -0.0825 0.9073\n' +
        'vn 0.3047 -0.8836 0.3555\n' +
        'vn 0.3047 0.8836 0.3555\n' +
        'vn 0.2218 0.4207 -0.8797\n' +
        'vn 0.2218 -0.4207 -0.8797\n' +
        'vn 0.7663 0.2873 -0.5747\n' +
        'vn 0.7663 -0.2873 -0.5747\n' +
        'vn 0.4580 -0.6542 0.6019\n' +
        'vn 0.4580 0.6542 0.6019\n' +
        'vn 0.6051 0.1052 0.7892\n' +
        'vn 0.6051 -0.1052 0.7892\n' +
        'vn 0.5832 0.7582 0.2916\n' +
        'vn 0.5832 -0.7582 0.2916\n' +
        'vn 0.5834 0.3889 -0.7130\n' +
        'vn 0.5834 -0.3889 -0.7130\n' +
        'vn 0.9718 0.0463 0.2314\n' +
        'vn 0.9718 -0.0463 0.2314\n' +
        'vn 0.9151 0.0335 -0.4018\n' +
        'vn 0.9151 -0.0335 -0.4018\n' +
        'vn 0.8809 -0.4452 -0.1610\n' +
        'vn 0.8809 0.4452 -0.1610\n' +
        'vn 0.8729 -0.2182 -0.4364\n' +
        'vn 0.8729 0.2182 -0.4364\n' +
        'vn 0.8916 0.4341 -0.1290\n' +
        'vn 0.8916 -0.4341 -0.1290\n' +
        'vn 0.9524 0.3008 0.0501\n' +
        'vn 0.9524 -0.3008 0.0501\n' +
        'vn 0.4996 0.8123 0.3010\n' +
        'vn 0.4996 -0.8123 0.3010\n' +
        'vn 0.4093 0.8753 0.2574\n' +
        'vn 0.4093 -0.8753 0.2574\n' +
        'vn 0.3060 0.9385 0.1601\n' +
        'vn 0.3060 -0.9385 0.1601\n' +
        'vn 0.7227 0.2237 -0.6539\n' +
        'vn 0.7227 -0.2237 -0.6539\n' +
        'vn 0.9677 -0.1536 -0.1997\n' +
        'vn 0.9677 0.1536 -0.1997\n' +
        'vn 0.9565 -0.2733 -0.1025\n' +
        'vn 0.9565 0.2733 -0.1025\n' +
        'vn 0.9759 -0.0976 0.1952\n' +
        'vn 0.9759 0.0976 0.1952\n' +
        'vn 0.2713 -0.1582 0.9494\n' +
        'vn 0.2713 0.1582 0.9494\n' +
        'vn 0.1328 -0.6934 0.7082\n' +
        'vn 0.1328 0.6934 0.7082\n' +
        'vn -0.0000 -1.0000 -0.0000\n' +
        'vn -0.0000 1.0000 -0.0000\n' +
        'vn 0.1181 0.3051 -0.9450\n' +
        'vn 0.1181 -0.3051 -0.9450\n' +
        'vn 0.9541 0.0298 -0.2981\n' +
        'vn 0.9541 -0.0298 -0.2981\n' +
        'vn 0.9277 0.1353 -0.3479\n' +
        'vn 0.9277 -0.1353 -0.3479\n' +
        'vn 0.8158 -0.5085 -0.2755\n' +
        'vn 0.8158 0.5085 -0.2755\n' +
        'vn 0.9223 -0.3843 -0.0419\n' +
        'vn 0.9223 0.3843 -0.0419\n' +
        'vn 0.9774 -0.2083 0.0374\n' +
        'vn 0.9774 0.2083 0.0374\n' +
        'vn 0.6674 -0.5721 -0.4767\n' +
        'vn 0.6674 0.5721 -0.4767\n' +
        'vn 0.6435 -0.1369 -0.7531\n' +
        'vn 0.6435 0.1369 -0.7531\n' +
        'vn 0.6814 0.4088 -0.6071\n' +
        'vn 0.6814 -0.4088 -0.6071\n' +
        'vn 0.7070 0.5740 -0.4130\n' +
        'vn 0.7070 -0.5740 -0.4130\n' +
        'vn 0.8183 0.5665 -0.0968\n' +
        'vn 0.8183 -0.5665 -0.0968\n' +
        'vn 0.8129 0.5703 0.1180\n' +
        'vn 0.8129 -0.5703 0.1180\n' +
        'vn 0.6719 0.4823 0.5621\n' +
        'vn 0.6719 -0.4823 0.5621\n' +
        'vn 0.7473 0.2604 0.6114\n' +
        'vn 0.7473 -0.2604 0.6114\n' +
        'vn 0.9182 0.1640 0.3607\n' +
        'vn 0.9182 -0.1640 0.3607\n' +
        'vn 0.9682 -0.0178 0.2495\n' +
        'vn 0.9682 0.0178 0.2495\n' +
        'vn 0.8481 0.3273 -0.4166\n' +
        'vn 0.8481 -0.3273 -0.4166\n' +
        'vn 0.9235 0.2811 -0.2610\n' +
        'vn 0.9235 -0.2811 -0.2610\n' +
        'vn 0.7149 -0.2542 -0.6514\n' +
        'vn 0.7149 0.2542 -0.6514\n' +
        'vn 0.5333 -0.0260 -0.8455\n' +
        'vn 0.5333 0.0260 -0.8455\n' +
        'vn 0.8991 -0.3518 -0.2606\n' +
        'vn 0.8991 0.3518 -0.2606\n' +
        'vn 0.9358 -0.3523 -0.0110\n' +
        'vn 0.9358 0.3523 -0.0110\n' +
        'vn 0.8777 -0.1317 0.4608\n' +
        'vn 0.8777 0.1317 0.4608\n' +
        'vn 0.7870 -0.0342 0.6159\n' +
        'vn 0.7870 0.0342 0.6159\n' +
        'vn 0.7277 0.3603 0.5836\n' +
        'vn 0.7277 -0.3603 0.5836\n' +
        'vn 0.6858 0.4988 0.5300\n' +
        'vn 0.6858 -0.4988 0.5300\n' +
        'vn 0.6667 0.6667 -0.3333\n' +
        'vn 0.6667 -0.6667 -0.3333\n' +
        'vn 0.5727 0.8165 -0.0731\n' +
        'vn 0.5727 -0.8165 -0.0731\n' +
        'vn 0.6098 0.7840 0.1161\n' +
        'vn 0.6098 -0.7840 0.1161\n' +
        'vn -0.2461 -0.5306 0.8111\n' +
        'vn -0.2461 0.5306 0.8111\n' +
        'vn -0.3730 -0.8511 0.3695\n' +
        'vn -0.3730 0.8511 0.3695\n' +
        'vn -0.4331 -0.2446 0.8675\n' +
        'vn -0.4331 0.2446 0.8675\n' +
        'vn -0.3030 0.5924 0.7465\n' +
        'vn -0.3030 -0.5924 0.7465\n' +
        'vn -0.3118 0.3685 0.8758\n' +
        'vn -0.3118 -0.3685 0.8758\n' +
        'vn -0.2880 0.2821 0.9151\n' +
        'vn -0.2880 -0.2821 0.9151\n' +
        'vn -0.4991 0.8561 0.1340\n' +
        'vn -0.4991 -0.8561 0.1340\n' +
        'vn -0.4376 0.5342 -0.7233\n' +
        'vn -0.4376 -0.5342 -0.7233\n' +
        'vn -0.4368 0.3849 -0.8131\n' +
        'vn -0.4368 -0.3849 -0.8131\n' +
        'vn -0.7800 0.2335 -0.5806\n' +
        'vn -0.7800 -0.2335 -0.5806\n' +
        'vn -0.9678 0.2449 -0.0583\n' +
        'vn -0.9678 -0.2449 -0.0583\n' +
        'vn -0.8837 0.1163 -0.4535\n' +
        'vn -0.8837 -0.1163 -0.4535\n' +
        'vn -0.1388 0.1152 -0.9836\n' +
        'vn -0.1388 -0.1152 -0.9836\n' +
        'vn -0.2260 0.1184 -0.9669\n' +
        'vn -0.2260 -0.1184 -0.9669\n' +
        'vn -0.2808 0.9597 -0.0085\n' +
        'vn -0.2808 -0.9597 -0.0085\n' +
        'vn -0.3242 0.9319 0.1629\n' +
        'vn -0.3242 -0.9319 0.1629\n' +
        'vn -0.9865 0.1626 0.0207\n' +
        'vn -0.9865 -0.1626 0.0207\n' +
        'vn -0.9758 -0.0188 -0.2177\n' +
        'vn -0.9758 0.0188 -0.2177\n' +
        'vn -0.5884 0.7538 -0.2926\n' +
        'vn -0.5884 -0.7538 -0.2926\n' +
        'vn -0.3678 0.9196 0.1379\n' +
        'vn -0.3678 -0.9196 0.1379\n' +
        'vn -0.1944 0.9297 0.3127\n' +
        'vn -0.1944 -0.9297 0.3127\n' +
        'vn -0.2329 0.9120 0.3376\n' +
        'vn -0.2329 -0.9120 0.3376\n' +
        'vn -0.0607 0.9407 0.3338\n' +
        'vn -0.0607 -0.9407 0.3338\n' +
        'vn -0.4402 0.1761 -0.8805\n' +
        'vn -0.4402 -0.1761 -0.8805\n' +
        'vn -0.7991 0.3708 -0.4733\n' +
        'vn -0.7991 -0.3708 -0.4733\n' +
        'vn -0.4660 0.3107 -0.8284\n' +
        'vn -0.4660 -0.3107 -0.8284\n' +
        'vn -0.1287 0.2793 -0.9515\n' +
        'vn -0.1287 -0.2793 -0.9515\n' +
        'vn -0.1807 0.3139 -0.9321\n' +
        'vn -0.1807 -0.3139 -0.9321\n' +
        'vn -0.0609 0.9762 -0.2083\n' +
        'vn -0.0609 -0.9762 -0.2083\n' +
        'vn 0.2447 0.8267 -0.5066\n' +
        'vn 0.2447 -0.8267 -0.5066\n' +
        'vn -0.9315 0.3449 -0.1158\n' +
        'vn -0.9315 -0.3449 -0.1158\n' +
        'vn 0.2355 0.1203 0.9644\n' +
        'vn 0.2355 -0.1203 0.9644\n' +
        'vn -0.1851 0.1275 0.9744\n' +
        'vn -0.1851 -0.1275 0.9744\n' +
        'vn -0.7241 0.3492 0.5947\n' +
        'vn -0.7241 -0.3492 0.5947\n' +
        'vn -0.1449 0.4153 0.8981\n' +
        'vn -0.1449 -0.4153 0.8981\n' +
        'vn 0.6863 0.1845 0.7036\n' +
        'vn 0.6863 -0.1845 0.7036\n' +
        'vn 0.1608 0.6056 0.7794\n' +
        'vn 0.1608 -0.6056 0.7794\n' +
        'vn -0.2053 0.7033 0.6806\n' +
        'vn -0.2053 -0.7033 0.6806\n' +
        'vn -0.7166 0.6679 0.2007\n' +
        'vn -0.7166 -0.6679 0.2007\n' +
        'vn -0.7528 0.4948 0.4342\n' +
        'vn -0.7528 -0.4948 0.4342\n' +
        'vn -0.1761 0.6423 0.7459\n' +
        'vn -0.1761 -0.6423 0.7459\n' +
        'vn 0.1530 0.7182 0.6788\n' +
        'vn 0.1530 -0.7182 0.6788\n' +
        'vn 0.5444 0.7388 0.3972\n' +
        'vn 0.5444 -0.7388 0.3972\n' +
        'vn -0.1579 0.3428 0.9261\n' +
        'vn -0.1579 -0.3428 0.9261\n' +
        'vn 0.7867 0.2270 0.5740\n' +
        'vn 0.7867 -0.2270 0.5740\n' +
        'vn -0.9795 -0.1722 0.1046\n' +
        'vn -0.9795 0.1722 0.1046\n' +
        'vn 0.4013 0.0425 0.9150\n' +
        'vn 0.4013 -0.0425 0.9150\n' +
        'vn 0.9694 -0.1616 0.1847\n' +
        'vn 0.9694 0.1616 0.1847\n' +
        'vn 0.0483 0.9791 0.1973\n' +
        'vn 0.0483 -0.9791 0.1973\n' +
        'vn 0.3079 0.9470 0.0918\n' +
        'vn 0.3079 -0.9470 0.0918\n' +
        'vn -0.0661 0.9794 0.1905\n' +
        'vn -0.0661 -0.9794 0.1905\n' +
        'vn -0.1070 0.9938 0.0312\n' +
        'vn -0.1070 -0.9938 0.0312\n' +
        'vn 0.0501 0.7116 -0.7008\n' +
        'vn 0.0501 -0.7116 -0.7008\n' +
        'vn 0.0847 0.3722 -0.9243\n' +
        'vn 0.0847 -0.3722 -0.9243\n' +
        'vn 0.2310 0.4465 -0.8644\n' +
        'vn 0.2310 -0.4465 -0.8644\n' +
        'vn 0.2405 0.6066 -0.7578\n' +
        'vn 0.2405 -0.6066 -0.7578\n' +
        'vn 0.2407 0.7325 -0.6368\n' +
        'vn 0.2407 -0.7325 -0.6368\n' +
        'vn 0.8533 0.2637 -0.4499\n' +
        'vn 0.8533 -0.2637 -0.4499\n' +
        'vn -0.7673 0.5568 -0.3181\n' +
        'vn -0.7673 -0.5568 -0.3181\n' +
        'vn -0.8190 0.5004 -0.2807\n' +
        'vn -0.8190 -0.5004 -0.2807\n' +
        'vn -0.4205 0.3190 -0.8494\n' +
        'vn -0.4205 -0.3190 -0.8494\n' +
        'vn -0.2793 0.7198 -0.6356\n' +
        'vn -0.2793 -0.7198 -0.6356\n' +
        'vn -0.7473 0.4972 -0.4408\n' +
        'vn -0.7473 -0.4972 -0.4408\n' +
        'vn 0.8557 0.3506 0.3807\n' +
        'vn 0.8557 -0.3506 0.3807\n' +
        'vn 0.8730 0.4566 0.1715\n' +
        'vn 0.8730 -0.4566 0.1715\n' +
        'vn 0.9603 0.2583 0.1055\n' +
        'vn 0.9603 -0.2583 0.1055\n' +
        'vn 0.9661 0.2455 -0.0802\n' +
        'vn 0.9661 -0.2455 -0.0802\n' +
        'vn 0.8837 0.4643 -0.0599\n' +
        'vn 0.8837 -0.4643 -0.0599\n' +
        'vn 0.7210 0.6225 -0.3045\n' +
        'vn 0.7210 -0.6225 -0.3045\n' +
        'vn 0.6027 0.4500 0.6590\n' +
        'vn 0.6027 -0.4500 0.6590\n' +
        'vn 0.4884 -0.2667 0.8309\n' +
        'vn 0.4884 0.2667 0.8309\n' +
        'vn 0.5111 -0.8284 0.2291\n' +
        'vn 0.5111 0.8284 0.2291\n' +
        'vn 0.7727 -0.5251 -0.3566\n' +
        'vn 0.7727 0.5251 -0.3566\n' +
        'vn 0.6873 0.4546 -0.5665\n' +
        'vn 0.6873 -0.4546 -0.5665\n' +
        'vn 0.5552 0.6996 -0.4497\n' +
        'vn 0.5552 -0.6996 -0.4497\n' +
        'vn -0.1126 0.7220 -0.6827\n' +
        'vn -0.1126 -0.7220 -0.6827\n' +
        'vn 0.9388 -0.1919 0.2860\n' +
        'vn 0.9388 0.1919 0.2860\n' +
        'vn -0.2047 0.9048 -0.3734\n' +
        'vn -0.2047 -0.9048 -0.3734\n' +
        'vn 0.9825 0.1034 0.1551\n' +
        'vn 0.9825 -0.1034 0.1551\n' +
        'vn 0.3530 0.0841 0.9318\n' +
        'vn 0.3530 -0.0841 0.9318\n' +
        'vn 0.7594 0.6446 -0.0883\n' +
        'vn 0.7594 -0.6446 -0.0883\n' +
        'vn 0.7678 0.4309 0.4740\n' +
        'vn 0.7678 -0.4309 0.4740\n' +
        'vn 0.3462 0.8032 -0.4847\n' +
        'vn 0.3462 -0.8032 -0.4847\n' +
        'vn 0.7014 0.5811 -0.4128\n' +
        'vn 0.7014 -0.5811 -0.4128\n' +
        'vn 0.6822 0.5910 -0.4305\n' +
        'vn 0.6822 -0.5910 -0.4305\n' +
        'vn -0.0591 0.9818 -0.1804\n' +
        'vn -0.0591 -0.9818 -0.1804\n' +
        'vn -0.1175 0.9105 -0.3965\n' +
        'vn -0.1175 -0.9105 -0.3965\n' +
        'vn -0.0725 0.9972 -0.0181\n' +
        'vn -0.0725 -0.9972 -0.0181\n' +
        'vn 0.1925 0.7313 -0.6543\n' +
        'vn 0.1925 -0.7313 -0.6543\n' +
        'vn 0.1073 0.7867 -0.6079\n' +
        'vn 0.1073 -0.7867 -0.6079\n' +
        'vn 0.1170 0.7022 -0.7022\n' +
        'vn 0.1170 -0.7022 -0.7022\n' +
        'vn -0.0511 0.1840 0.9816\n' +
        'vn -0.0511 -0.1840 0.9816\n' +
        'vn 0.1284 0.9352 0.3301\n' +
        'vn 0.1284 -0.9352 0.3301\n' +
        'vn 0.0553 0.6633 -0.7463\n' +
        'vn 0.0553 -0.6633 -0.7463\n' +
        'vn 0.0767 -0.0085 0.9970\n' +
        'vn 0.0767 0.0085 0.9970\n' +
        'vn 0.3354 0.6237 -0.7061\n' +
        'vn 0.3354 -0.6237 -0.7061\n' +
        'vn 0.3587 0.2733 -0.8925\n' +
        'vn 0.3587 -0.2733 -0.8925\n' +
        'vn -0.2200 -0.8328 -0.5080\n' +
        'vn -0.2200 0.8328 -0.5080\n' +
        'vn -0.4981 -0.8339 0.2377\n' +
        'vn -0.4981 0.8339 0.2377\n' +
        'vn -0.2539 -0.5655 0.7847\n' +
        'vn -0.2539 0.5655 0.7847\n' +
        'vn 0.0672 -0.0560 0.9962\n' +
        'vn 0.0672 0.0560 0.9962\n' +
        'vn 0.9893 0.1445 0.0222\n' +
        'vn 0.9893 -0.1445 0.0222\n' +
        'vn 0.9427 0.3275 0.0645\n' +
        'vn 0.9427 -0.3275 0.0645\n' +
        'vn 0.9496 0.3127 0.0232\n' +
        'vn 0.9496 -0.3127 0.0232\n' +
        'vn 0.9849 0.1710 0.0274\n' +
        'vn 0.9849 -0.1710 0.0274\n' +
        'vn 0.8929 0.3487 0.2849\n' +
        'vn 0.8929 -0.3487 0.2849\n' +
        'vn 0.9156 0.4006 -0.0343\n' +
        'vn 0.9156 -0.4006 -0.0343\n' +
        'vn 0.9645 0.2572 -0.0603\n' +
        'vn 0.9645 -0.2572 -0.0603\n' +
        'vn 0.9979 0.0637 -0.0106\n' +
        'vn 0.9979 -0.0637 -0.0106\n' +
        'vn 0.6101 -0.3637 0.7039\n' +
        'vn 0.6101 0.3637 0.7039\n' +
        'vn 0.7759 0.6299 0.0355\n' +
        'vn 0.7759 -0.6299 0.0355\n' +
        'vn 0.8717 0.4472 -0.2002\n' +
        'vn 0.8717 -0.4472 -0.2002\n' +
        'vn 0.8348 0.5072 -0.2141\n' +
        'vn 0.8348 -0.5072 -0.2141\n' +
        'vn 0.8093 0.5258 0.2619\n' +
        'vn 0.8093 -0.5258 0.2619\n' +
        'vn 0.7580 0.2980 0.5802\n' +
        'vn 0.7580 -0.2980 0.5802\n' +
        'vn -0.0805 0.0930 -0.9924\n' +
        'vn -0.0805 -0.0930 -0.9924\n' +
        'vn 0.0080 0.5006 -0.8657\n' +
        'vn 0.0080 -0.5006 -0.8657\n' +
        'vn 0.2748 0.9285 -0.2497\n' +
        'vn 0.2748 -0.9285 -0.2497\n' +
        'vn -0.0378 0.8393 0.5424\n' +
        'vn -0.0378 -0.8393 0.5424\n' +
        'vn -0.2589 -0.2355 0.9367\n' +
        'vn -0.2589 0.2355 0.9367\n' +
        'vn -0.1285 -0.4499 0.8838\n' +
        'vn -0.1285 0.4499 0.8838\n' +
        'vn -0.8427 -0.5384 -0.0098\n' +
        'vn -0.8427 0.5384 -0.0098\n' +
        'vn -0.9813 -0.1910 -0.0241\n' +
        'vn -0.9813 0.1910 -0.0241\n' +
        'vn -0.9141 0.4046 0.0266\n' +
        'vn -0.9141 -0.4046 0.0266\n' +
        'vn 0.0197 -0.7819 0.6231\n' +
        'vn 0.0197 0.7819 0.6231\n' +
        'vn -0.8142 0.5428 -0.2063\n' +
        'vn -0.8142 -0.5428 -0.2063\n' +
        'vn -0.2945 -0.2474 -0.9231\n' +
        'vn -0.2945 0.2474 -0.9231\n' +
        'vt 0.870622 0.589649\n' +
        'vt 0.868067 0.821510\n' +
        'vt 0.860081 0.560115\n' +
        'vt 0.856226 0.850547\n' +
        'vt 0.853018 0.521562\n' +
        'vt 0.847458 0.888748\n' +
        'vt 0.798481 0.569535\n' +
        'vt 0.795104 0.838402\n' +
        'vt 0.828900 0.590771\n' +
        'vt 0.826436 0.818537\n' +
        'vt 0.854402 0.604754\n' +
        'vt 0.852534 0.805700\n' +
        'vt 0.854107 0.625459\n' +
        'vt 0.853157 0.785002\n' +
        'vt 0.828171 0.633354\n' +
        'vt 0.827598 0.775964\n' +
        'vt 0.791018 0.645443\n' +
        'vt 0.791018 0.762238\n' +
        'vt 0.842358 0.702491\n' +
        'vt 0.844839 0.707525\n' +
        'vt 0.855181 0.668527\n' +
        'vt 0.856142 0.742025\n' +
        'vt 0.867508 0.642291\n' +
        'vt 0.867293 0.768782\n' +
        'vt 0.890474 0.641909\n' +
        'vt 0.890219 0.770183\n' +
        'vt 0.900375 0.666964\n' +
        'vt 0.901223 0.745592\n' +
        'vt 0.918898 0.699697\n' +
        'vt 0.921180 0.713713\n' +
        'vt 0.968392 0.645333\n' +
        'vt 0.968213 0.770220\n' +
        'vt 0.931889 0.636832\n' +
        'vt 0.931368 0.777093\n' +
        'vt 0.905882 0.627902\n' +
        'vt 0.904990 0.784860\n' +
        'vt 0.906232 0.605742\n' +
        'vt 0.904357 0.807013\n' +
        'vt 0.933717 0.593037\n' +
        'vt 0.931250 0.820926\n' +
        'vt 0.968392 0.573812\n' +
        'vt 0.965038 0.841671\n' +
        'vt 0.920166 0.524546\n' +
        'vt 0.914672 0.888748\n' +
        'vt 0.904571 0.559404\n' +
        'vt 0.900640 0.853232\n' +
        'vt 0.890955 0.590063\n' +
        'vt 0.888398 0.821999\n' +
        'vt 0.889591 0.593275\n' +
        'vt 0.887178 0.818729\n' +
        'vt 0.902359 0.607909\n' +
        'vt 0.900583 0.804677\n' +
        'vt 0.899781 0.626257\n' +
        'vt 0.898822 0.786233\n' +
        'vt 0.887842 0.636527\n' +
        'vt 0.887351 0.775442\n' +
        'vt 0.870908 0.635245\n' +
        'vt 0.870376 0.775972\n' +
        'vt 0.859881 0.623942\n' +
        'vt 0.858859 0.786774\n' +
        'vt 0.879400 0.616512\n' +
        'vt 0.878029 0.795063\n' +
        'vt 0.859664 0.608186\n' +
        'vt 0.857942 0.802505\n' +
        'vt 0.871664 0.593961\n' +
        'vt 0.869299 0.817249\n' +
        'vt 0.521923 0.386009\n' +
        'vt 0.521086 0.343868\n' +
        'vt 0.518925 0.093952\n' +
        'vt 0.518998 0.159028\n' +
        'vt 0.519132 0.185382\n' +
        'vt 0.518925 0.083865\n' +
        'vt 0.523031 0.433628\n' +
        'vt 0.819845 0.468071\n' +
        'vt 0.215894 0.503605\n' +
        'vt 0.845499 0.449967\n' +
        'vt 0.185281 0.484099\n' +
        'vt 0.999856 0.254640\n' +
        'vt 0.000144 0.259113\n' +
        'vt 0.994525 0.167705\n' +
        'vt 0.011829 0.155367\n' +
        'vt 0.945900 0.079569\n' +
        'vt 0.078961 0.060719\n' +
        'vt 0.805584 0.010786\n' +
        'vt 0.232648 0.003484\n' +
        'vt 0.605512 0.165134\n' +
        'vt 0.432024 0.165644\n' +
        'vt 0.583135 0.108495\n' +
        'vt 0.454527 0.108481\n' +
        'vt 0.563812 0.076586\n' +
        'vt 0.474014 0.076511\n' +
        'vt 0.555073 0.061900\n' +
        'vt 0.482805 0.061829\n' +
        'vt 0.551930 0.058338\n' +
        'vt 0.485955 0.058273\n' +
        'vt 0.540260 0.053805\n' +
        'vt 0.497626 0.053770\n' +
        'vt 0.518916 0.050294\n' +
        'vt 0.647395 0.200502\n' +
        'vt 0.389677 0.201890\n' +
        'vt 0.676379 0.233241\n' +
        'vt 0.360308 0.235899\n' +
        'vt 0.715342 0.265392\n' +
        'vt 0.320452 0.270303\n' +
        'vt 0.707254 0.310054\n' +
        'vt 0.330721 0.316853\n' +
        'vt 0.697446 0.332673\n' +
        'vt 0.341964 0.339667\n' +
        'vt 0.662817 0.372521\n' +
        'vt 0.379297 0.378686\n' +
        'vt 0.626842 0.395792\n' +
        'vt 0.416915 0.400552\n' +
        'vt 0.604826 0.397804\n' +
        'vt 0.439252 0.401540\n' +
        'vt 0.553095 0.390512\n' +
        'vt 0.490934 0.391862\n' +
        'vt 0.577279 0.340156\n' +
        'vt 0.464579 0.342230\n' +
        'vt 0.558527 0.316594\n' +
        'vt 0.482619 0.317843\n' +
        'vt 0.572941 0.258564\n' +
        'vt 0.466409 0.259709\n' +
        'vt 0.613992 0.242662\n' +
        'vt 0.424464 0.244473\n' +
        'vt 0.639236 0.253047\n' +
        'vt 0.398938 0.255633\n' +
        'vt 0.664101 0.277872\n' +
        'vt 0.374100 0.281778\n' +
        'vt 0.668440 0.297958\n' +
        'vt 0.370304 0.302644\n' +
        'vt 0.662406 0.312804\n' +
        'vt 0.377061 0.317685\n' +
        'vt 0.634472 0.332311\n' +
        'vt 0.406362 0.336480\n' +
        'vt 0.599845 0.344815\n' +
        'vt 0.441977 0.347815\n' +
        'vt 0.518927 0.085180\n' +
        'vt 0.531019 0.087431\n' +
        'vt 0.506827 0.087416\n' +
        'vt 0.531231 0.073829\n' +
        'vt 0.506626 0.073811\n' +
        'vt 0.525483 0.068967\n' +
        'vt 0.512375 0.068956\n' +
        'vt 0.518928 0.067899\n' +
        'vt 0.517577 0.190607\n' +
        'vt 0.519841 0.200843\n' +
        'vt 0.544281 0.193366\n' +
        'vt 0.493996 0.193428\n' +
        'vt 0.548362 0.173560\n' +
        'vt 0.489683 0.173693\n' +
        'vt 0.538112 0.158382\n' +
        'vt 0.499851 0.158434\n' +
        'vt 0.621513 0.227818\n' +
        'vt 0.416514 0.229490\n' +
        'vt 0.664761 0.253225\n' +
        'vt 0.372747 0.256357\n' +
        'vt 0.683908 0.279995\n' +
        'vt 0.353696 0.284606\n' +
        'vt 0.687515 0.311539\n' +
        'vt 0.351187 0.317440\n' +
        'vt 0.676824 0.323937\n' +
        'vt 0.362723 0.329722\n' +
        'vt 0.639050 0.357330\n' +
        'vt 0.402772 0.362131\n' +
        'vt 0.618316 0.375151\n' +
        'vt 0.424583 0.379267\n' +
        'vt 0.600808 0.377857\n' +
        'vt 0.442396 0.381222\n' +
        'vt 0.559674 0.357011\n' +
        'vt 0.482938 0.358497\n' +
        'vt 0.553118 0.209599\n' +
        'vt 0.485339 0.210053\n' +
        'vt 0.555621 0.121749\n' +
        'vt 0.482177 0.121781\n' +
        'vt 0.548333 0.084893\n' +
        'vt 0.489507 0.084858\n' +
        'vt 0.546290 0.072669\n' +
        'vt 0.491565 0.072625\n' +
        'vt 0.542788 0.064089\n' +
        'vt 0.495083 0.064047\n' +
        'vt 0.536419 0.062072\n' +
        'vt 0.501452 0.062043\n' +
        'vt 0.518925 0.059681\n' +
        'vt 0.519760 0.248864\n' +
        'vt 0.520277 0.294764\n' +
        'vt 0.615546 0.342005\n' +
        'vt 0.425972 0.345582\n' +
        'vt 0.563905 0.272007\n' +
        'vt 0.475886 0.273078\n' +
        'vt 0.556923 0.291214\n' +
        'vt 0.483433 0.292249\n' +
        'vt 0.532669 0.090920\n' +
        'vt 0.505177 0.090908\n' +
        'vt 0.532042 0.127713\n' +
        'vt 0.505828 0.127728\n' +
        'vt 0.518941 0.128358\n' +
        'vt 0.518981 0.151749\n' +
        'vt 0.535214 0.166808\n' +
        'vt 0.502799 0.166857\n' +
        'vt 0.537959 0.175966\n' +
        'vt 0.500100 0.176033\n' +
        'vt 0.537248 0.187577\n' +
        'vt 0.500890 0.187571\n' +
        'vt 0.528757 0.191785\n' +
        'vt 0.509219 0.191626\n' +
        'vt 0.519099 0.179457\n' +
        'vt 0.528222 0.186316\n' +
        'vt 0.509787 0.186260\n' +
        'vt 0.533528 0.184215\n' +
        'vt 0.504547 0.184206\n' +
        'vt 0.533449 0.176739\n' +
        'vt 0.504604 0.176791\n' +
        'vt 0.531131 0.171631\n' +
        'vt 0.506910 0.171667\n' +
        'vt 0.519016 0.165599\n' +
        'vt 0.596138 0.133426\n' +
        'vt 0.441395 0.133592\n' +
        'vt 0.561572 0.167779\n' +
        'vt 0.476363 0.167996\n' +
        'vt 0.559475 0.149319\n' +
        'vt 0.478371 0.149447\n' +
        'vt 0.601169 0.147885\n' +
        'vt 0.436337 0.148194\n' +
        'vt 0.518929 0.069468\n' +
        'vt 0.523751 0.070508\n' +
        'vt 0.514106 0.070501\n' +
        'vt 0.529036 0.075429\n' +
        'vt 0.508820 0.075415\n' +
        'vt 0.528933 0.084957\n' +
        'vt 0.508915 0.084945\n' +
        'vt 0.518926 0.079331\n' +
        'vt 0.524601 0.079886\n' +
        'vt 0.513252 0.079879\n' +
        'vt 0.524236 0.076691\n' +
        'vt 0.513619 0.076684\n' +
        'vt 0.521560 0.074970\n' +
        'vt 0.516297 0.074966\n' +
        'vt 0.518928 0.074259\n' +
        'vt 0.568351 0.292904\n' +
        'vt 0.471978 0.294282\n' +
        'vt 0.571787 0.277295\n' +
        'vt 0.468070 0.278617\n' +
        'vt 0.614408 0.331972\n' +
        'vt 0.426727 0.335361\n' +
        'vt 0.601033 0.333624\n' +
        'vt 0.440344 0.336537\n' +
        'vt 0.629040 0.323864\n' +
        'vt 0.411556 0.327673\n' +
        'vt 0.652752 0.310186\n' +
        'vt 0.386858 0.314615\n' +
        'vt 0.656064 0.297636\n' +
        'vt 0.383015 0.301864\n' +
        'vt 0.653658 0.279971\n' +
        'vt 0.384904 0.283634\n' +
        'vt 0.632494 0.262853\n' +
        'vt 0.406068 0.265508\n' +
        'vt 0.611720 0.255725\n' +
        'vt 0.427062 0.257728\n' +
        'vt 0.580734 0.266620\n' +
        'vt 0.458737 0.268049\n' +
        'vt 0.573085 0.311386\n' +
        'vt 0.467790 0.313081\n' +
        'vt 0.584855 0.327708\n' +
        'vt 0.456477 0.329961\n' +
        'vt 0.590644 0.321516\n' +
        'vt 0.450408 0.323919\n' +
        'vt 0.579548 0.309340\n' +
        'vt 0.461204 0.311233\n' +
        'vt 0.585166 0.270991\n' +
        'vt 0.454369 0.272583\n' +
        'vt 0.612641 0.261560\n' +
        'vt 0.426254 0.263693\n' +
        'vt 0.629829 0.267263\n' +
        'vt 0.408893 0.269959\n' +
        'vt 0.647785 0.283486\n' +
        'vt 0.391040 0.287071\n' +
        'vt 0.649541 0.296225\n' +
        'vt 0.389662 0.300183\n' +
        'vt 0.646248 0.306421\n' +
        'vt 0.393381 0.310510\n' +
        'vt 0.626851 0.320513\n' +
        'vt 0.413648 0.324175\n' +
        'vt 0.601799 0.328453\n' +
        'vt 0.439372 0.331331\n' +
        'vt 0.613335 0.327083\n' +
        'vt 0.427623 0.330358\n' +
        'vt 0.578124 0.281900\n' +
        'vt 0.461798 0.283441\n' +
        'vt 0.577524 0.293776\n' +
        'vt 0.462754 0.295432\n' +
        'vt 0.553209 0.433063\n' +
        'vt 0.815858 0.445381\n' +
        'vt 0.492809 0.434538\n' +
        'vt 0.219260 0.477186\n' +
        'vt 0.609819 0.431516\n' +
        'vt 0.770572 0.444261\n' +
        'vt 0.435860 0.435740\n' +
        'vt 0.271364 0.473316\n' +
        'vt 0.648174 0.419316\n' +
        'vt 0.755700 0.418603\n' +
        'vt 0.396518 0.425416\n' +
        'vt 0.287033 0.442912\n' +
        'vt 0.692106 0.388274\n' +
        'vt 0.770185 0.379538\n' +
        'vt 0.350292 0.396229\n' +
        'vt 0.268122 0.398737\n' +
        'vt 0.726332 0.341754\n' +
        'vt 0.749542 0.334683\n' +
        'vt 0.312756 0.350588\n' +
        'vt 0.288183 0.346496\n' +
        'vt 0.735879 0.312112\n' +
        'vt 0.301067 0.320593\n' +
        'vt 0.729900 0.256393\n' +
        'vt 0.304876 0.261087\n' +
        'vt 0.698172 0.216906\n' +
        'vt 0.337414 0.219179\n' +
        'vt 0.663103 0.190671\n' +
        'vt 0.373474 0.191872\n' +
        'vt 0.911671 0.402429\n' +
        'vt 0.106400 0.432652\n' +
        'vt 0.962901 0.344752\n' +
        'vt 0.043968 0.367038\n' +
        'vt 0.891780 0.036916\n' +
        'vt 0.142277 0.021467\n' +
        'vt 0.672384 0.022201\n' +
        'vt 0.365979 0.020991\n' +
        'vt 0.518922 0.024886\n' +
        'vt 0.567460 0.000144\n' +
        'vt 0.470636 0.000144\n' +
        'vt 0.626908 0.015608\n' +
        'vt 0.411318 0.015131\n' +
        'vt 0.649444 0.022378\n' +
        'vt 0.388827 0.021586\n' +
        'vt 0.789046 0.233323\n' +
        'vt 0.241255 0.236977\n' +
        'vt 0.809631 0.233887\n' +
        'vt 0.219168 0.237388\n' +
        'vt 0.842355 0.195160\n' +
        'vt 0.620420 0.565675\n' +
        'vt 0.176788 0.196179\n' +
        'vt 0.145041 0.562595\n' +
        'vt 0.909112 0.183261\n' +
        'vt 0.107928 0.179083\n' +
        'vt 0.760215 0.193244\n' +
        'vt 0.271553 0.193871\n' +
        'vt 0.785486 0.152330\n' +
        'vt 0.391039 0.611891\n' +
        'vt 0.245969 0.151002\n' +
        'vt 0.369913 0.610196\n' +
        'vt 0.837382 0.156361\n' +
        'vt 0.498072 0.552315\n' +
        'vt 0.196622 0.155241\n' +
        'vt 0.264218 0.550140\n' +
        'vt 0.886245 0.121777\n' +
        'vt 0.141314 0.112482\n' +
        'vt 0.626663 0.111357\n' +
        'vt 0.410618 0.111244\n' +
        'vt 0.660451 0.076084\n' +
        'vt 0.376796 0.075296\n' +
        'vt 0.576951 0.057998\n' +
        'vt 0.460920 0.057845\n' +
        'vt 0.611687 0.078268\n' +
        'vt 0.425932 0.077985\n' +
        'vt 0.558059 0.053871\n' +
        'vt 0.479842 0.053785\n' +
        'vt 0.577206 0.032801\n' +
        'vt 0.460782 0.032656\n' +
        'vt 0.621440 0.048089\n' +
        'vt 0.416419 0.047631\n' +
        'vt 0.547413 0.041724\n' +
        'vt 0.490511 0.041669\n' +
        'vt 0.629482 0.130456\n' +
        'vt 0.407648 0.130594\n' +
        'vt 0.623495 0.146796\n' +
        'vt 0.413741 0.147158\n' +
        'vt 0.619303 0.159841\n' +
        'vt 0.418035 0.160361\n' +
        'vt 0.687018 0.077204\n' +
        'vt 0.349875 0.075955\n' +
        'vt 0.788458 0.080826\n' +
        'vt 0.246353 0.076510\n' +
        'vt 0.849114 0.099732\n' +
        'vt 0.183115 0.092127\n' +
        'vt 0.915360 0.259804\n' +
        'vt 0.098965 0.266968\n' +
        'vt 0.894128 0.301884\n' +
        'vt 0.123776 0.315519\n' +
        'vt 0.862868 0.338556\n' +
        'vt 0.160557 0.356821\n' +
        'vt 0.794286 0.364062\n' +
        'vt 0.239776 0.382592\n' +
        'vt 0.766337 0.300809\n' +
        'vt 0.267408 0.310142\n' +
        'vt 0.789162 0.313727\n' +
        'vt 0.242992 0.325552\n' +
        'vt 0.846174 0.293397\n' +
        'vt 0.178537 0.304983\n' +
        'vt 0.815314 0.276388\n' +
        'vt 0.213065 0.285164\n' +
        'vt 0.845007 0.256352\n' +
        'vt 0.179662 0.263312\n' +
        'vt 0.873517 0.265922\n' +
        'vt 0.147089 0.274284\n' +
        'vt 0.886999 0.233769\n' +
        'vt 0.131514 0.237587\n' +
        'vt 0.859075 0.228168\n' +
        'vt 0.162803 0.231720\n' +
        'vt 0.875030 0.184705\n' +
        'vt 0.145224 0.182749\n' +
        'vt 0.858171 0.137775\n' +
        'vt 0.171653 0.132294\n' +
        'vt 0.391747 0.862097\n' +
        'vt 0.829287 0.219562\n' +
        'vt 0.363377 0.861308\n' +
        'vt 0.199067 0.222464\n' +
        'vt 0.051216 0.522659\n' +
        'vt 0.715482 0.139727\n' +
        'vt 0.319538 0.139409\n' +
        'vt 0.786480 0.117591\n' +
        'vt 0.246666 0.114850\n' +
        'vt 0.432388 0.894943\n' +
        'vt 0.740843 0.572428\n' +
        'vt 0.834578 0.206879\n' +
        'vt 0.321637 0.893225\n' +
        'vt 0.033664 0.564403\n' +
        'vt 0.434803 0.658882\n' +
        'vt 0.325318 0.656224\n' +
        'vt 0.508270 0.697693\n' +
        'vt 0.250811 0.693249\n' +
        'vt 0.563786 0.739211\n' +
        'vt 0.194086 0.733241\n' +
        'vt 0.619962 0.791615\n' +
        'vt 0.136063 0.784093\n' +
        'vt 0.604825 0.879946\n' +
        'vt 0.707492 0.759884\n' +
        'vt 0.148729 0.873349\n' +
        'vt 0.049526 0.748824\n' +
        'vt 0.506166 0.904851\n' +
        'vt 0.745511 0.652100\n' +
        'vt 0.247207 0.901159\n' +
        'vt 0.019409 0.639749\n' +
        'vt 0.491058 0.881714\n' +
        'vt 0.263032 0.878321\n' +
        'vt 0.572792 0.860484\n' +
        'vt 0.181486 0.854693\n' +
        'vt 0.586396 0.793977\n' +
        'vt 0.169745 0.787474\n' +
        'vt 0.549027 0.746412\n' +
        'vt 0.208656 0.740879\n' +
        'vt 0.500314 0.711729\n' +
        'vt 0.258399 0.707497\n' +
        'vt 0.438641 0.680683\n' +
        'vt 0.320962 0.677959\n' +
        'vt 0.438797 0.870229\n' +
        'vt 0.315867 0.868209\n' +
        'vt 0.457832 0.840040\n' +
        'vt 0.297562 0.837358\n' +
        'vt 0.452955 0.700023\n' +
        'vt 0.306136 0.696976\n' +
        'vt 0.505666 0.730944\n' +
        'vt 0.252524 0.726592\n' +
        'vt 0.542850 0.755753\n' +
        'vt 0.214575 0.750414\n' +
        'vt 0.568148 0.787367\n' +
        'vt 0.188269 0.781375\n' +
        'vt 0.555495 0.826352\n' +
        'vt 0.199850 0.820889\n' +
        'vt 0.501231 0.844356\n' +
        'vt 0.253846 0.840502\n' +
        'vt 0.401605 0.841460\n' +
        'vt 0.825107 0.209762\n' +
        'vt 0.354026 0.840297\n' +
        'vt 0.199767 0.214827\n' +
        'vt 0.418086 0.784946\n' +
        'vt 0.338952 0.783073\n' +
        'vt 0.410995 0.747662\n' +
        'vt 0.347028 0.745816\n' +
        'vt 0.427812 0.742828\n' +
        'vt 0.330270 0.740536\n' +
        'vt 0.433669 0.729661\n' +
        'vt 0.324726 0.727177\n' +
        'vt 0.435018 0.718280\n' +
        'vt 0.323658 0.715731\n' +
        'vt 0.783193 0.187449\n' +
        'vt 0.246955 0.187075\n' +
        'vt 0.394766 0.686125\n' +
        'vt 0.796021 0.176969\n' +
        'vt 0.364838 0.684445\n' +
        'vt 0.233625 0.175620\n' +
        'vt 0.384658 0.710299\n' +
        'vt 0.802192 0.184609\n' +
        'vt 0.374400 0.708969\n' +
        'vt 0.226485 0.183086\n' +
        'vt 0.384657 0.795423\n' +
        'vt 0.816266 0.203086\n' +
        'vt 0.372270 0.794472\n' +
        'vt 0.209828 0.206161\n' +
        'vt 0.431333 0.817535\n' +
        'vt 0.324790 0.815460\n' +
        'vt 0.448505 0.804621\n' +
        'vt 0.307886 0.802031\n' +
        'vt 0.440995 0.724383\n' +
        'vt 0.317510 0.721697\n' +
        'vt 0.445392 0.731997\n' +
        'vt 0.312907 0.729222\n' +
        'vt 0.437950 0.749777\n' +
        'vt 0.319919 0.747250\n' +
        'vt 0.423718 0.754191\n' +
        'vt 0.334089 0.752045\n' +
        'vt 0.435868 0.779569\n' +
        'vt 0.321237 0.777208\n' +
        'vt 0.512485 0.828811\n' +
        'vt 0.242975 0.824574\n' +
        'vt 0.550942 0.811814\n' +
        'vt 0.204839 0.806417\n' +
        'vt 0.552139 0.787682\n' +
        'vt 0.204331 0.782156\n' +
        'vt 0.539407 0.764539\n' +
        'vt 0.217774 0.759319\n' +
        'vt 0.508439 0.743135\n' +
        'vt 0.249419 0.738732\n' +
        'vt 0.455277 0.713731\n' +
        'vt 0.303460 0.710657\n' +
        'vt 0.473386 0.824700\n' +
        'vt 0.282357 0.821525\n' +
        'vt 0.454776 0.761665\n' +
        'vt 0.302729 0.758742\n' +
        'vt 0.470841 0.748408\n' +
        'vt 0.286960 0.745020\n' +
        'vt 0.488870 0.770464\n' +
        'vt 0.268291 0.766661\n' +
        'vt 0.475403 0.783904\n' +
        'vt 0.281439 0.780511\n' +
        'vt 0.494476 0.802470\n' +
        'vt 0.261790 0.798626\n' +
        'vt 0.503673 0.787562\n' +
        'vt 0.252972 0.783410\n' +
        'vt 0.518562 0.791602\n' +
        'vt 0.237920 0.787045\n' +
        'vt 0.516802 0.807339\n' +
        'vt 0.239243 0.802891\n' +
        'vt 0.677256 0.670436\n' +
        'vt 0.083564 0.662038\n' +
        'vt 0.660647 0.741167\n' +
        'vt 0.097038 0.732052\n' +
        'vt 0.616701 0.759965\n' +
        'vt 0.140379 0.752377\n' +
        'vt 0.581052 0.726933\n' +
        'vt 0.177176 0.720426\n' +
        'vt 0.543385 0.683538\n' +
        'vt 0.216123 0.678120\n' +
        'vt 0.484068 0.628776\n' +
        'vt 0.276936 0.625067\n' +
        'vt 0.834705 0.206959\n' +
        'vt 0.671403 0.592656\n' +
        'vt 0.092820 0.589862\n' +
        's 0\n' +
        'f 47/47/1 1/1/1 3/3/1 45/45/1\n' +
        'f 4/4/2 2/2/2 48/48/2 46/46/2\n' +
        'f 45/45/3 3/3/3 5/5/3 43/43/3\n' +
        'f 6/6/4 4/4/4 46/46/4 44/44/4\n' +
        'f 3/3/5 9/9/5 7/7/5 5/5/5\n' +
        'f 8/8/6 10/10/6 4/4/6 6/6/6\n' +
        'f 1/1/7 11/11/7 9/9/7 3/3/7\n' +
        'f 10/10/8 12/12/8 2/2/8 4/4/8\n' +
        'f 11/11/9 13/13/9 15/15/9 9/9/9\n' +
        'f 16/16/10 14/14/10 12/12/10 10/10/10\n' +
        'f 9/9/11 15/15/11 17/17/11 7/7/11\n' +
        'f 18/18/12 16/16/12 10/10/12 8/8/12\n' +
        'f 15/15/13 21/21/13 19/19/13 17/17/13\n' +
        'f 20/20/14 22/22/14 16/16/14 18/18/14\n' +
        'f 13/13/15 23/23/15 21/21/15 15/15/15\n' +
        'f 22/22/16 24/24/16 14/14/16 16/16/16\n' +
        'f 23/23/17 25/25/17 27/27/17 21/21/17\n' +
        'f 28/28/18 26/26/18 24/24/18 22/22/18\n' +
        'f 21/21/19 27/27/19 29/29/19 19/19/19\n' +
        'f 30/30/20 28/28/20 22/22/20 20/20/20\n' +
        'f 27/27/21 33/33/21 31/31/21 29/29/21\n' +
        'f 32/32/22 34/34/22 28/28/22 30/30/22\n' +
        'f 25/25/23 35/35/23 33/33/23 27/27/23\n' +
        'f 34/34/24 36/36/24 26/26/24 28/28/24\n' +
        'f 35/35/25 37/37/25 39/39/25 33/33/25\n' +
        'f 40/40/26 38/38/26 36/36/26 34/34/26\n' +
        'f 33/33/27 39/39/27 41/41/27 31/31/27\n' +
        'f 42/42/28 40/40/28 34/34/28 32/32/28\n' +
        'f 39/39/29 45/45/29 43/43/29 41/41/29\n' +
        'f 44/44/30 46/46/30 40/40/30 42/42/30\n' +
        'f 37/37/31 47/47/31 45/45/31 39/39/31\n' +
        'f 46/46/32 48/48/32 38/38/32 40/40/32\n' +
        'f 47/47/33 37/37/33 51/51/33 49/49/33\n' +
        'f 52/52/34 38/38/34 48/48/34 50/50/34\n' +
        'f 37/37/35 35/35/35 53/53/35 51/51/35\n' +
        'f 54/54/36 36/36/36 38/38/36 52/52/36\n' +
        'f 35/35/37 25/25/37 55/55/37 53/53/37\n' +
        'f 56/56/38 26/26/38 36/36/38 54/54/38\n' +
        'f 25/25/39 23/23/39 57/57/39 55/55/39\n' +
        'f 58/58/40 24/24/40 26/26/40 56/56/40\n' +
        'f 23/23/41 13/13/41 59/59/41 57/57/41\n' +
        'f 60/60/42 14/14/42 24/24/42 58/58/42\n' +
        'f 13/13/43 11/11/43 63/63/43 59/59/43\n' +
        'f 64/64/44 12/12/44 14/14/44 60/60/44\n' +
        'f 11/11/45 1/1/45 65/65/45 63/63/45\n' +
        'f 66/66/46 2/2/46 12/12/46 64/64/46\n' +
        'f 1/1/47 47/47/47 49/49/47 65/65/47\n' +
        'f 50/50/48 48/48/48 2/2/48 66/66/48\n' +
        'f 61/61/49 65/65/49 49/49/49\n' +
        'f 50/50/50 66/66/50 62/62/50\n' +
        'f 63/63/51 65/65/51 61/61/51\n' +
        'f 62/62/52 66/66/52 64/64/52\n' +
        'f 61/61/53 59/59/53 63/63/53\n' +
        'f 64/64/54 60/60/54 62/62/54\n' +
        'f 61/61/55 57/57/55 59/59/55\n' +
        'f 60/60/56 58/58/56 62/62/56\n' +
        'f 61/61/57 55/55/57 57/57/57\n' +
        'f 58/58/58 56/56/58 62/62/58\n' +
        'f 61/61/59 53/53/59 55/55/59\n' +
        'f 56/56/60 54/54/60 62/62/60\n' +
        'f 61/61/61 51/51/61 53/53/61\n' +
        'f 54/54/62 52/52/62 62/62/62\n' +
        'f 61/61/63 49/49/63 51/51/63\n' +
        'f 52/52/64 50/50/64 62/62/64\n' +
        'f 89/96/65 174/181/65 176/183/65 91/98/65\n' +
        'f 176/183/66 175/182/66 90/97/66 91/98/66\n' +
        'f 87/94/67 172/179/67 174/181/67 89/96/67\n' +
        'f 175/182/68 173/180/68 88/95/68 90/97/68\n' +
        'f 85/92/69 170/177/69 172/179/69 87/94/69\n' +
        'f 173/180/70 171/178/70 86/93/70 88/95/70\n' +
        'f 83/90/71 168/175/71 170/177/71 85/92/71\n' +
        'f 171/178/72 169/176/72 84/91/72 86/93/72\n' +
        'f 81/88/73 166/173/73 168/175/73 83/90/73\n' +
        'f 169/176/74 167/174/74 82/89/74 84/91/74\n' +
        'f 79/86/75 92/99/75 146/153/75 164/171/75\n' +
        'f 147/154/76 93/100/76 80/87/76 165/172/76\n' +
        'f 92/99/77 94/101/77 148/155/77 146/153/77\n' +
        'f 149/156/78 95/102/78 93/100/78 147/154/78\n' +
        'f 94/101/79 96/103/79 150/157/79 148/155/79\n' +
        'f 151/158/80 97/104/80 95/102/80 149/156/80\n' +
        'f 96/103/81 98/105/81 152/159/81 150/157/81\n' +
        'f 153/160/82 99/106/82 97/104/82 151/158/82\n' +
        'f 98/105/83 100/107/83 154/161/83 152/159/83\n' +
        'f 155/162/84 101/108/84 99/106/84 153/160/84\n' +
        'f 100/107/85 102/109/85 156/163/85 154/161/85\n' +
        'f 157/164/86 103/110/86 101/108/86 155/162/86\n' +
        'f 102/109/87 104/111/87 158/165/87 156/163/87\n' +
        'f 159/166/88 105/112/88 103/110/88 157/164/88\n' +
        'f 104/111/89 106/113/89 160/167/89 158/165/89\n' +
        'f 161/168/90 107/114/90 105/112/90 159/166/90\n' +
        'f 106/113/91 108/115/91 162/169/91 160/167/91\n' +
        'f 163/170/92 109/116/92 107/114/92 161/168/92\n' +
        'f 108/115/93 67/67/93 68/68/93 162/169/93\n' +
        'f 68/68/94 67/67/94 109/116/94 163/170/94\n' +
        'f 110/117/95 128/135/95 160/167/95 162/169/95\n' +
        'f 161/168/96 129/136/96 111/118/96 163/170/96\n' +
        'f 128/135/97 179/186/97 158/165/97 160/167/97\n' +
        'f 159/166/98 180/187/98 129/136/98 161/168/98\n' +
        'f 126/133/99 156/163/99 158/165/99 179/186/99\n' +
        'f 159/166/100 157/164/100 127/134/100 180/187/100\n' +
        'f 124/131/101 154/161/101 156/163/101 126/133/101\n' +
        'f 157/164/102 155/162/102 125/132/102 127/134/102\n' +
        'f 122/129/103 152/159/103 154/161/103 124/131/103\n' +
        'f 155/162/104 153/160/104 123/130/104 125/132/104\n' +
        'f 120/127/105 150/157/105 152/159/105 122/129/105\n' +
        'f 153/160/106 151/158/106 121/128/106 123/130/106\n' +
        'f 118/125/107 148/155/107 150/157/107 120/127/107\n' +
        'f 151/158/108 149/156/108 119/126/108 121/128/108\n' +
        'f 116/123/109 146/153/109 148/155/109 118/125/109\n' +
        'f 149/156/110 147/154/110 117/124/110 119/126/110\n' +
        'f 114/121/111 164/171/111 146/153/111 116/123/111\n' +
        'f 147/154/112 165/172/112 115/122/112 117/124/112\n' +
        'f 114/121/113 181/188/113 177/184/113 164/171/113\n' +
        'f 177/184/114 182/189/114 115/122/114 165/172/114\n' +
        'f 110/117/115 162/169/115 68/68/115 112/119/115\n' +
        'f 68/68/116 163/170/116 111/118/116 113/120/116\n' +
        'f 112/119/117 68/68/117 178/185/117 183/190/117\n' +
        'f 178/185/118 68/68/118 113/120/118 184/191/118\n' +
        'f 177/184/119 181/188/119 183/190/119 178/185/119\n' +
        'f 184/191/120 182/189/120 177/184/120 178/185/120\n' +
        'f 135/142/121 137/144/121 176/183/121 174/181/121\n' +
        'f 176/183/122 137/144/122 136/143/122 175/182/122\n' +
        'f 133/140/123 135/142/123 174/181/123 172/179/123\n' +
        'f 175/182/124 136/143/124 134/141/124 173/180/124\n' +
        'f 131/138/125 133/140/125 172/179/125 170/177/125\n' +
        'f 173/180/126 134/141/126 132/139/126 171/178/126\n' +
        'f 166/173/127 187/194/127 185/192/127 168/175/127\n' +
        'f 186/193/128 188/195/128 167/174/128 169/176/128\n' +
        'f 131/138/129 170/177/129 168/175/129 185/192/129\n' +
        'f 169/176/130 171/178/130 132/139/130 186/193/130\n' +
        'f 144/151/131 190/197/131 189/196/131 187/194/131\n' +
        'f 189/196/132 190/197/132 145/152/132 188/195/132\n' +
        'f 185/192/133 187/194/133 189/196/133 69/69/133\n' +
        'f 189/196/134 188/195/134 186/193/134 69/69/134\n' +
        'f 130/137/135 131/138/135 185/192/135 69/69/135\n' +
        'f 186/193/135 132/139/135 130/137/135 69/69/135\n' +
        'f 142/149/136 193/200/136 191/198/136 144/151/136\n' +
        'f 192/199/137 194/201/137 143/150/137 145/152/137\n' +
        'f 140/147/138 195/202/138 193/200/138 142/149/138\n' +
        'f 194/201/139 196/203/139 141/148/139 143/150/139\n' +
        'f 139/146/140 197/204/140 195/202/140 140/147/140\n' +
        'f 196/203/141 198/205/141 139/146/141 141/148/141\n' +
        'f 138/145/142 71/71/142 197/204/142 139/146/142\n' +
        'f 198/205/143 71/71/143 138/145/143 139/146/143\n' +
        'f 190/197/144 144/151/144 191/198/144 70/70/144\n' +
        'f 192/199/145 145/152/145 190/197/145 70/70/145\n' +
        'f 70/70/146 191/198/146 206/213/146 208/215/146\n' +
        'f 207/214/147 192/199/147 70/70/147 208/215/147\n' +
        'f 71/71/148 199/206/148 200/207/148 197/204/148\n' +
        'f 201/208/149 199/206/149 71/71/149 198/205/149\n' +
        'f 197/204/150 200/207/150 202/209/150 195/202/150\n' +
        'f 203/210/151 201/208/151 198/205/151 196/203/151\n' +
        'f 195/202/152 202/209/152 204/211/152 193/200/152\n' +
        'f 205/212/153 203/210/153 196/203/153 194/201/153\n' +
        'f 193/200/154 204/211/154 206/213/154 191/198/154\n' +
        'f 207/214/155 205/212/155 194/201/155 192/199/155\n' +
        'f 199/206/156 204/211/156 202/209/156 200/207/156\n' +
        'f 203/210/157 205/212/157 199/206/157 201/208/157\n' +
        'f 199/206/158 208/215/158 206/213/158 204/211/158\n' +
        'f 207/214/159 208/215/159 199/206/159 205/212/159\n' +
        'f 139/146/160 140/147/160 164/171/160 177/184/160\n' +
        'f 165/172/161 141/148/161 139/146/161 177/184/161\n' +
        'f 140/147/162 142/149/162 211/218/162 164/171/162\n' +
        'f 212/219/163 143/150/163 141/148/163 165/172/163\n' +
        'f 142/149/164 144/151/164 213/220/164 211/218/164\n' +
        'f 214/221/165 145/152/165 143/150/165 212/219/165\n' +
        'f 144/151/166 187/194/166 166/173/166 213/220/166\n' +
        'f 167/174/167 188/195/167 145/152/167 214/221/167\n' +
        'f 81/88/168 209/216/168 213/220/168 166/173/168\n' +
        'f 214/221/169 210/217/169 82/89/169 167/174/169\n' +
        'f 209/216/170 215/222/170 211/218/170 213/220/170\n' +
        'f 212/219/171 216/223/171 210/217/171 214/221/171\n' +
        'f 79/86/172 164/171/172 211/218/172 215/222/172\n' +
        'f 212/219/173 165/172/173 80/87/173 216/223/173\n' +
        'f 131/138/174 130/137/174 72/72/174 222/229/174\n' +
        'f 72/72/175 130/137/175 132/139/175 223/230/175\n' +
        'f 133/140/176 131/138/176 222/229/176 220/227/176\n' +
        'f 223/230/177 132/139/177 134/141/177 221/228/177\n' +
        'f 135/142/178 133/140/178 220/227/178 218/225/178\n' +
        'f 221/228/179 134/141/179 136/143/179 219/226/179\n' +
        'f 137/144/180 135/142/180 218/225/180 217/224/180\n' +
        'f 219/226/181 136/143/181 137/144/181 217/224/181\n' +
        'f 217/224/182 218/225/182 229/236/182 231/238/182\n' +
        'f 230/237/183 219/226/183 217/224/183 231/238/183\n' +
        'f 218/225/184 220/227/184 227/234/184 229/236/184\n' +
        'f 228/235/185 221/228/185 219/226/185 230/237/185\n' +
        'f 220/227/186 222/229/186 225/232/186 227/234/186\n' +
        'f 226/233/187 223/230/187 221/228/187 228/235/187\n' +
        'f 222/229/188 72/72/188 224/231/188 225/232/188\n' +
        'f 224/231/189 72/72/189 223/230/189 226/233/189\n' +
        'f 224/231/190 231/238/190 229/236/190 225/232/190\n' +
        'f 230/237/191 231/238/191 224/231/191 226/233/191\n' +
        'f 225/232/192 229/236/192 227/234/192\n' +
        'f 228/235/193 230/237/193 226/233/193\n' +
        'f 183/190/194 181/188/194 234/241/194 232/239/194\n' +
        'f 235/242/195 182/189/195 184/191/195 233/240/195\n' +
        'f 112/119/196 183/190/196 232/239/196 254/261/196\n' +
        'f 233/240/197 184/191/197 113/120/197 255/262/197\n' +
        'f 110/117/198 112/119/198 254/261/198 256/263/198\n' +
        'f 255/262/199 113/120/199 111/118/199 257/264/199\n' +
        'f 181/188/200 114/121/200 252/259/200 234/241/200\n' +
        'f 253/260/201 115/122/201 182/189/201 235/242/201\n' +
        'f 114/121/202 116/123/202 250/257/202 252/259/202\n' +
        'f 251/258/203 117/124/203 115/122/203 253/260/203\n' +
        'f 116/123/204 118/125/204 248/255/204 250/257/204\n' +
        'f 249/256/205 119/126/205 117/124/205 251/258/205\n' +
        'f 118/125/206 120/127/206 246/253/206 248/255/206\n' +
        'f 247/254/207 121/128/207 119/126/207 249/256/207\n' +
        'f 120/127/208 122/129/208 244/251/208 246/253/208\n' +
        'f 245/252/209 123/130/209 121/128/209 247/254/209\n' +
        'f 122/129/210 124/131/210 242/249/210 244/251/210\n' +
        'f 243/250/211 125/132/211 123/130/211 245/252/211\n' +
        'f 124/131/212 126/133/212 240/247/212 242/249/212\n' +
        'f 241/248/213 127/134/213 125/132/213 243/250/213\n' +
        'f 126/133/214 179/186/214 236/243/214 240/247/214\n' +
        'f 237/244/215 180/187/215 127/134/215 241/248/215\n' +
        'f 179/186/216 128/135/216 238/245/216 236/243/216\n' +
        'f 239/246/217 129/136/217 180/187/217 237/244/217\n' +
        'f 128/135/218 110/117/218 256/263/218 238/245/218\n' +
        'f 257/264/219 111/118/219 129/136/219 239/246/219\n' +
        'f 238/245/220 256/263/220 258/265/220 276/283/220\n' +
        'f 259/266/221 257/264/221 239/246/221 277/284/221\n' +
        'f 236/243/222 238/245/222 276/283/222 278/285/222\n' +
        'f 277/284/223 239/246/223 237/244/223 279/286/223\n' +
        'f 240/247/224 236/243/224 278/285/224 274/281/224\n' +
        'f 279/286/225 237/244/225 241/248/225 275/282/225\n' +
        'f 242/249/226 240/247/226 274/281/226 272/279/226\n' +
        'f 275/282/227 241/248/227 243/250/227 273/280/227\n' +
        'f 244/251/228 242/249/228 272/279/228 270/277/228\n' +
        'f 273/280/229 243/250/229 245/252/229 271/278/229\n' +
        'f 246/253/230 244/251/230 270/277/230 268/275/230\n' +
        'f 271/278/231 245/252/231 247/254/231 269/276/231\n' +
        'f 248/255/232 246/253/232 268/275/232 266/273/232\n' +
        'f 269/276/233 247/254/233 249/256/233 267/274/233\n' +
        'f 250/257/234 248/255/234 266/273/234 264/271/234\n' +
        'f 267/274/235 249/256/235 251/258/235 265/272/235\n' +
        'f 252/259/236 250/257/236 264/271/236 262/269/236\n' +
        'f 265/272/237 251/258/237 253/260/237 263/270/237\n' +
        'f 234/241/238 252/259/238 262/269/238 280/287/238\n' +
        'f 263/270/239 253/260/239 235/242/239 281/288/239\n' +
        'f 256/263/240 254/261/240 260/267/240 258/265/240\n' +
        'f 261/268/241 255/262/241 257/264/241 259/266/241\n' +
        'f 254/261/242 232/239/242 282/289/242 260/267/242\n' +
        'f 283/290/243 233/240/243 255/262/243 261/268/243\n' +
        'f 232/239/244 234/241/244 280/287/244 282/289/244\n' +
        'f 281/288/245 235/242/245 233/240/245 283/290/245\n' +
        'f 67/67/246 108/115/246 284/291/246 73/73/246\n' +
        'f 285/293/247 109/116/247 67/67/247 73/73/247\n' +
        'f 108/115/248 106/113/248 286/295/248 284/291/248\n' +
        'f 287/297/249 107/114/249 109/116/249 285/293/249\n' +
        'f 106/113/250 104/111/250 288/299/250 286/295/250\n' +
        'f 289/301/251 105/112/251 107/114/251 287/297/251\n' +
        'f 104/111/252 102/109/252 290/303/252 288/299/252\n' +
        'f 291/305/253 103/110/253 105/112/253 289/301/253\n' +
        'f 102/109/254 100/107/254 292/307/254 290/303/254\n' +
        'f 293/309/255 101/108/255 103/110/255 291/305/255\n' +
        'f 100/107/256 98/105/256 294/311/256 292/307/256\n' +
        'f 295/312/257 99/106/257 101/108/257 293/309/257\n' +
        'f 98/105/258 96/103/258 296/313/258 294/311/258\n' +
        'f 297/314/259 97/104/259 99/106/259 295/312/259\n' +
        'f 96/103/260 94/101/260 298/315/260 296/313/260\n' +
        'f 299/316/261 95/102/261 97/104/261 297/314/261\n' +
        'f 94/101/262 92/99/262 300/317/262 298/315/262\n' +
        'f 301/318/263 93/100/263 95/102/263 299/316/263\n' +
        'f 308/330/264 309/332/264 328/358/264 338/368/264\n' +
        'f 329/359/265 309/333/265 308/331/265 339/369/265\n' +
        'f 307/328/266 308/330/266 338/368/266 336/366/266\n' +
        'f 339/369/267 308/331/267 307/329/267 337/367/267\n' +
        'f 306/327/268 307/328/268 336/366/268 340/370/268\n' +
        'f 337/367/269 307/329/269 306/327/269 341/371/269\n' +
        'f 89/96/270 91/98/270 306/327/270 340/370/270\n' +
        'f 306/327/271 91/98/271 90/97/271 341/371/271\n' +
        'f 87/94/272 89/96/272 340/370/272 334/364/272\n' +
        'f 341/371/273 90/97/273 88/95/273 335/365/273\n' +
        'f 85/92/274 87/94/274 334/364/274 330/360/274\n' +
        'f 335/365/275 88/95/275 86/93/275 331/361/275\n' +
        'f 83/90/276 85/92/276 330/360/276 332/362/276\n' +
        'f 331/361/277 86/93/277 84/91/277 333/363/277\n' +
        'f 330/360/278 336/366/278 338/368/278 332/362/278\n' +
        'f 339/369/279 337/367/279 331/361/279 333/363/279\n' +
        'f 330/360/280 334/364/280 340/370/280 336/366/280\n' +
        'f 341/371/281 335/365/281 331/361/281 337/367/281\n' +
        'f 326/356/282 332/362/282 338/368/282 328/358/282\n' +
        'f 339/369/283 333/363/283 327/357/283 329/359/283\n' +
        'f 81/88/284 83/90/284 332/362/284 326/356/284\n' +
        'f 333/363/285 84/91/285 82/89/285 327/357/285\n' +
        'f 209/216/286 342/372/286 344/374/286 215/222/286\n' +
        'f 345/375/287 343/373/287 210/217/287 216/223/287\n' +
        'f 81/88/288 326/356/288 342/372/288 209/216/288\n' +
        'f 343/373/289 327/357/289 82/89/289 210/217/289\n' +
        'f 79/86/290 215/222/290 344/374/290 346/376/290\n' +
        'f 345/375/291 216/223/291 80/87/291 347/377/291\n' +
        'f 79/86/292 346/376/292 300/317/292 92/99/292\n' +
        'f 301/318/293 347/377/293 80/87/293 93/100/293\n' +
        'f 77/82/294 324/354/294 352/382/294 304/323/294\n' +
        'f 353/383/295 325/355/295 77/83/295 304/324/295\n' +
        'f 304/323/296 352/382/296 350/380/296 78/84/296\n' +
        'f 351/381/297 353/383/297 304/324/297 78/85/297\n' +
        'f 78/84/298 350/380/298 348/378/298 305/325/298\n' +
        'f 349/379/299 351/381/299 78/85/299 305/326/299\n' +
        'f 305/325/300 348/378/300 328/358/300 309/332/300\n' +
        'f 329/359/301 349/379/301 305/326/301 309/333/301\n' +
        'f 326/356/302 328/358/302 348/378/302 342/372/302\n' +
        'f 349/379/303 329/359/303 327/357/303 343/373/303\n' +
        'f 296/313/304 298/315/304 318/344/304 310/334/304\n' +
        'f 319/345/305 299/316/305 297/314/305 311/335/305\n' +
        'f 76/80/306 316/342/306 324/354/306 77/82/306\n' +
        'f 325/355/307 317/343/307 76/81/307 77/83/307\n' +
        'f 302/319/308 358/388/308 356/386/308 303/321/308\n' +
        'f 357/387/309 359/389/309 302/320/309 303/322/309\n' +
        'f 303/321/310 356/386/310 354/384/310 75/78/310\n' +
        'f 355/385/311 357/387/311 303/322/311 75/79/311\n' +
        'f 75/78/312 354/384/312 316/342/312 76/80/312\n' +
        'f 317/343/313 355/385/313 75/79/313 76/81/313\n' +
        'f 292/308/314 294/311/314 362/392/314 364/394/314\n' +
        'f 363/393/315 295/312/315 293/310/315 365/395/315\n' +
        'f 364/394/316 362/392/316 368/398/316 366/396/316\n' +
        'f 369/399/317 363/393/317 365/395/317 367/397/317\n' +
        'f 366/396/318 368/398/318 370/400/318 372/402/318\n' +
        'f 371/401/319 369/399/319 367/397/319 373/403/319\n' +
        'f 372/402/320 370/400/320 376/406/320 374/404/320\n' +
        'f 377/407/321 371/401/321 373/403/321 375/405/321\n' +
        'f 314/338/322 378/408/322 374/404/322 376/406/322\n' +
        'f 375/405/323 379/409/323 315/340/323 377/407/323\n' +
        'f 316/342/324 354/384/324 374/404/324 378/408/324\n' +
        'f 375/405/325 355/385/325 317/343/325 379/409/325\n' +
        'f 354/384/326 356/386/326 372/402/326 374/404/326\n' +
        'f 373/403/327 357/387/327 355/385/327 375/405/327\n' +
        'f 356/386/328 358/388/328 366/396/328 372/402/328\n' +
        'f 367/397/329 359/389/329 357/387/329 373/403/329\n' +
        'f 358/388/330 360/390/330 364/394/330 366/396/330\n' +
        'f 365/395/331 361/391/331 359/389/331 367/397/331\n' +
        'f 290/304/332 292/308/332 364/394/332 360/390/332\n' +
        'f 365/395/333 293/310/333 291/306/333 361/391/333\n' +
        'f 74/76/334 360/390/334 358/388/334 302/319/334\n' +
        'f 359/389/335 361/391/335 74/77/335 302/320/335\n' +
        'f 284/292/336 286/296/336 288/300/336 290/304/336\n' +
        'f 289/302/337 287/298/337 285/294/337 291/306/337\n' +
        'f 284/292/338 290/304/338 360/390/338 74/76/338\n' +
        'f 361/391/339 291/306/339 285/294/339 74/77/339\n' +
        'f 73/74/340 284/292/340 74/76/340\n' +
        'f 74/77/341 285/294/341 73/75/341\n' +
        'f 294/311/342 296/313/342 310/334/342 362/392/342\n' +
        'f 311/335/343 297/314/343 295/312/343 363/393/343\n' +
        'f 310/334/344 312/336/344 368/398/344 362/392/344\n' +
        'f 369/399/345 313/337/345 311/335/345 363/393/345\n' +
        'f 312/336/346 382/413/346 370/400/346 368/398/346\n' +
        'f 371/401/347 383/415/347 313/337/347 369/399/347\n' +
        'f 314/338/348 376/406/348 370/400/348 382/413/348\n' +
        'f 371/401/349 377/407/349 315/340/349 383/415/349\n' +
        'f 348/378/350 350/380/350 386/419/350 384/417/350\n' +
        'f 387/420/351 351/381/351 349/379/351 385/418/351\n' +
        'f 318/344/352 384/417/352 386/419/352 320/346/352\n' +
        'f 387/420/353 385/418/353 319/345/353 321/348/353\n' +
        'f 298/315/354 300/317/354 384/417/354 318/344/354\n' +
        'f 385/418/355 301/318/355 299/316/355 319/345/355\n' +
        'f 300/317/356 344/374/356 342/372/356 384/417/356\n' +
        'f 343/373/357 345/375/357 301/318/357 385/418/357\n' +
        'f 342/372/358 348/378/358 384/417/358\n' +
        'f 385/418/359 349/379/359 343/373/359\n' +
        'f 300/317/360 346/376/360 344/374/360\n' +
        'f 345/375/361 347/377/361 301/318/361\n' +
        'f 314/338/362 322/350/362 380/410/362 378/408/362\n' +
        'f 381/411/363 323/352/363 315/340/363 379/409/363\n' +
        'f 316/342/364 378/408/364 380/410/364 324/354/364\n' +
        'f 381/411/365 379/409/365 317/343/365 325/355/365\n' +
        'f 320/346/366 386/419/366 380/410/366 322/350/366\n' +
        'f 381/411/367 387/420/367 321/348/367 323/352/367\n' +
        'f 350/380/368 352/382/368 380/410/368 386/419/368\n' +
        'f 381/411/369 353/383/369 351/381/369 387/420/369\n' +
        'f 324/354/370 380/410/370 352/382/370\n' +
        'f 353/383/371 381/411/371 325/355/371\n' +
        'f 400/438/372 388/421/372 414/454/372 402/442/372\n' +
        'f 415/455/373 389/424/373 401/440/373 403/443/373\n' +
        'f 400/438/374 402/442/374 404/444/374 398/434/374\n' +
        'f 405/445/375 403/443/375 401/440/375 399/436/375\n' +
        'f 398/434/376 404/444/376 406/446/376 396/432/376\n' +
        'f 407/447/377 405/445/377 399/436/377 397/433/377\n' +
        'f 396/432/378 406/446/378 408/448/378 394/430/378\n' +
        'f 409/449/379 407/447/379 397/433/379 395/431/379\n' +
        'f 394/430/380 408/448/380 410/450/380 392/428/380\n' +
        'f 411/451/381 409/449/381 395/431/381 393/429/381\n' +
        'f 392/428/382 410/450/382 412/452/382 390/426/382\n' +
        'f 413/453/383 411/451/383 393/429/383 391/427/383\n' +
        'f 410/450/384 420/460/384 418/458/384 412/452/384\n' +
        'f 419/459/385 421/461/385 411/451/385 413/453/385\n' +
        'f 408/448/386 422/462/386 420/460/386 410/450/386\n' +
        'f 421/461/387 423/463/387 409/449/387 411/451/387\n' +
        'f 406/446/388 424/464/388 422/462/388 408/448/388\n' +
        'f 423/463/389 425/465/389 407/447/389 409/449/389\n' +
        'f 404/444/390 426/466/390 424/464/390 406/446/390\n' +
        'f 425/465/391 427/467/391 405/445/391 407/447/391\n' +
        'f 402/442/392 428/468/392 426/466/392 404/444/392\n' +
        'f 427/467/393 429/469/393 403/443/393 405/445/393\n' +
        'f 402/442/394 414/454/394 416/456/394 428/468/394\n' +
        'f 417/457/395 415/455/395 403/443/395 429/469/395\n' +
        'f 318/344/396 320/346/396 444/487/396 442/484/396\n' +
        'f 445/489/397 321/348/397 319/345/397 443/485/397\n' +
        'f 320/347/398 390/426/398 412/452/398 444/486/398\n' +
        'f 413/453/399 391/427/399 321/349/399 445/488/399\n' +
        'f 310/334/400 318/344/400 442/484/400 312/336/400\n' +
        'f 443/485/401 319/345/401 311/335/401 313/337/401\n' +
        'f 382/412/402 430/470/402 414/454/402 388/421/402\n' +
        'f 415/455/403 431/472/403 383/414/403 389/424/403\n' +
        'f 412/452/404 418/458/404 440/482/404 444/486/404\n' +
        'f 441/483/405 419/459/405 413/453/405 445/488/405\n' +
        'f 438/480/406 446/490/406 444/486/406 440/482/406\n' +
        'f 445/488/407 447/492/407 439/481/407 441/483/407\n' +
        'f 434/476/408 446/490/408 438/480/408 436/478/408\n' +
        'f 439/481/409 447/492/409 435/477/409 437/479/409\n' +
        'f 432/474/410 448/494/410 446/490/410 434/476/410\n' +
        'f 447/492/411 449/496/411 433/475/411 435/477/411\n' +
        'f 430/470/412 448/494/412 432/474/412 450/498/412\n' +
        'f 433/475/413 449/496/413 431/472/413 451/499/413\n' +
        'f 414/454/414 430/470/414 450/498/414 416/456/414\n' +
        'f 451/499/415 431/472/415 415/455/415 417/457/415\n' +
        'f 312/336/416 448/495/416 430/471/416 382/413/416\n' +
        'f 431/473/417 449/497/417 313/337/417 383/415/417\n' +
        'f 312/336/418 442/484/418 446/491/418 448/495/418\n' +
        'f 447/493/419 443/485/419 313/337/419 449/497/419\n' +
        'f 442/484/420 444/487/420 446/491/420\n' +
        'f 447/493/421 445/489/421 443/485/421\n' +
        'f 416/456/422 450/498/422 452/500/422 476/524/422\n' +
        'f 453/501/423 451/499/423 417/457/423 477/525/423\n' +
        'f 450/498/424 432/474/424 462/510/424 452/500/424\n' +
        'f 463/511/425 433/475/425 451/499/425 453/501/425\n' +
        'f 432/474/426 434/476/426 460/508/426 462/510/426\n' +
        'f 461/509/427 435/477/427 433/475/427 463/511/427\n' +
        'f 434/476/428 436/478/428 458/506/428 460/508/428\n' +
        'f 459/507/429 437/479/429 435/477/429 461/509/429\n' +
        'f 436/478/430 438/480/430 456/504/430 458/506/430\n' +
        'f 457/505/431 439/481/431 437/479/431 459/507/431\n' +
        'f 438/480/432 440/482/432 454/502/432 456/504/432\n' +
        'f 455/503/433 441/483/433 439/481/433 457/505/433\n' +
        'f 440/482/434 418/458/434 474/522/434 454/502/434\n' +
        'f 475/523/435 419/459/435 441/483/435 455/503/435\n' +
        'f 428/468/436 416/456/436 476/524/436 464/512/436\n' +
        'f 477/525/437 417/457/437 429/469/437 465/513/437\n' +
        'f 426/466/438 428/468/438 464/512/438 466/514/438\n' +
        'f 465/513/439 429/469/439 427/467/439 467/515/439\n' +
        'f 424/464/440 426/466/440 466/514/440 468/516/440\n' +
        'f 467/515/441 427/467/441 425/465/441 469/517/441\n' +
        'f 422/462/442 424/464/442 468/516/442 470/518/442\n' +
        'f 469/517/443 425/465/443 423/463/443 471/519/443\n' +
        'f 420/460/444 422/462/444 470/518/444 472/520/444\n' +
        'f 471/519/445 423/463/445 421/461/445 473/521/445\n' +
        'f 418/458/446 420/460/446 472/520/446 474/522/446\n' +
        'f 473/521/447 421/461/447 419/459/447 475/523/447\n' +
        'f 458/506/448 456/504/448 480/528/448 478/526/448\n' +
        'f 481/529/449 457/505/449 459/507/449 479/527/449\n' +
        'f 478/526/450 480/528/450 482/530/450 484/532/450\n' +
        'f 483/531/451 481/529/451 479/527/451 485/533/451\n' +
        'f 484/532/452 482/530/452 488/536/452 486/534/452\n' +
        'f 489/537/453 483/531/453 485/533/453 487/535/453\n' +
        'f 486/534/454 488/536/454 490/538/454 492/540/454\n' +
        'f 491/539/455 489/537/455 487/535/455 493/541/455\n' +
        'f 464/512/456 476/524/456 486/534/456 492/540/456\n' +
        'f 487/535/457 477/525/457 465/513/457 493/541/457\n' +
        'f 452/500/458 484/532/458 486/534/458 476/524/458\n' +
        'f 487/535/459 485/533/459 453/501/459 477/525/459\n' +
        'f 452/500/460 462/510/460 478/526/460 484/532/460\n' +
        'f 479/527/461 463/511/461 453/501/461 485/533/461\n' +
        'f 458/506/462 478/526/462 462/510/462 460/508/462\n' +
        'f 463/511/463 479/527/463 459/507/463 461/509/463\n' +
        'f 454/502/464 474/522/464 480/528/464 456/504/464\n' +
        'f 481/529/465 475/523/465 455/503/465 457/505/465\n' +
        'f 472/520/466 482/530/466 480/528/466 474/522/466\n' +
        'f 481/529/467 483/531/467 473/521/467 475/523/467\n' +
        'f 470/518/468 488/536/468 482/530/468 472/520/468\n' +
        'f 483/531/469 489/537/469 471/519/469 473/521/469\n' +
        'f 468/516/470 490/538/470 488/536/470 470/518/470\n' +
        'f 489/537/471 491/539/471 469/517/471 471/519/471\n' +
        'f 466/514/472 492/540/472 490/538/472 468/516/472\n' +
        'f 491/539/473 493/541/473 467/515/473 469/517/473\n' +
        'f 464/512/474 492/540/474 466/514/474\n' +
        'f 467/515/475 493/541/475 465/513/475\n' +
        'f 392/428/476 390/426/476 504/552/476 502/550/476\n' +
        'f 505/553/477 391/427/477 393/429/477 503/551/477\n' +
        'f 394/430/478 392/428/478 502/550/478 500/548/478\n' +
        'f 503/551/479 393/429/479 395/431/479 501/549/479\n' +
        'f 396/432/480 394/430/480 500/548/480 498/546/480\n' +
        'f 501/549/481 395/431/481 397/433/481 499/547/481\n' +
        'f 398/435/482 396/432/482 498/546/482 496/544/482\n' +
        'f 499/547/483 397/433/483 399/437/483 497/545/483\n' +
        'f 400/439/484 398/435/484 496/544/484 494/542/484\n' +
        'f 497/545/485 399/437/485 401/441/485 495/543/485\n' +
        'f 388/422/486 400/439/486 494/542/486 506/555/486\n' +
        'f 495/543/487 401/441/487 389/425/487 507/556/487\n' +
        'f 494/542/488 502/550/488 504/552/488 506/555/488\n' +
        'f 505/553/489 503/551/489 495/543/489 507/556/489\n' +
        'f 494/542/490 496/544/490 500/548/490 502/550/490\n' +
        'f 501/549/491 497/545/491 495/543/491 503/551/491\n' +
        'f 496/544/492 498/546/492 500/548/492\n' +
        'f 501/549/493 499/547/493 497/545/493\n' +
        'f 314/338/494 382/413/494 388/423/494 506/554/494\n' +
        'f 389/425/495 383/416/495 315/341/495 507/556/495\n' +
        'f 314/339/496 506/555/496 504/552/496 322/351/496\n' +
        'f 505/553/497 507/556/497 315/341/497 323/353/497\n' +
        'f 320/347/498 322/351/498 504/552/498 390/426/498\n' +
        'f 505/553/499 323/353/499 321/349/499 391/427/499\n';
}

export function suzanne_monkey_highres_obj_string() {
    return '# Blender 3.5.1\n' +
        '# www.blender.org\n' +
        'mtllib monkey_highres.mtl\n' +
        'o Suzanne\n' +
        'v 0.756944 0.439019 0.159939\n' +
        'v 0.756944 -0.439019 0.159939\n' +
        'v 0.684896 0.483073 0.112847\n' +
        'v 0.684896 -0.483073 0.112847\n' +
        'v 0.582031 0.527344 0.072917\n' +
        'v 0.582031 -0.527344 0.072917\n' +
        'v 0.615885 0.351563 0.002604\n' +
        'v 0.615885 -0.351562 0.002604\n' +
        'v 0.711155 0.351780 0.059028\n' +
        'v 0.711155 -0.351780 0.059028\n' +
        'v 0.774306 0.352648 0.125868\n' +
        'v 0.774306 -0.352648 0.125868\n' +
        'v 0.788846 0.269314 0.159939\n' +
        'v 0.788846 -0.269314 0.159939\n' +
        'v 0.731988 0.221137 0.112847\n' +
        'v 0.731988 -0.221137 0.112847\n' +
        'v 0.644531 0.175781 0.072917\n' +
        'v 0.644531 -0.175781 0.072917\n' +
        'v 0.653646 0.104167 0.243490\n' +
        'v 0.653646 -0.104167 0.243490\n' +
        'v 0.736545 0.167101 0.242622\n' +
        'v 0.736545 -0.167101 0.242622\n' +
        'v 0.791667 0.235243 0.243273\n' +
        'v 0.791667 -0.235243 0.243273\n' +
        'v 0.788846 0.269314 0.329861\n' +
        'v 0.788846 -0.269314 0.329861\n' +
        'v 0.731988 0.221137 0.373698\n' +
        'v 0.731988 -0.221137 0.373698\n' +
        'v 0.644531 0.175781 0.417969\n' +
        'v 0.644531 -0.175781 0.417969\n' +
        'v 0.615885 0.351563 0.489583\n' +
        'v 0.615885 -0.351563 0.489583\n' +
        'v 0.711155 0.351780 0.427951\n' +
        'v 0.711155 -0.351779 0.427951\n' +
        'v 0.774306 0.352648 0.365017\n' +
        'v 0.774306 -0.352648 0.365017\n' +
        'v 0.756944 0.439019 0.329861\n' +
        'v 0.756945 -0.439019 0.329861\n' +
        'v 0.684896 0.483073 0.373698\n' +
        'v 0.684896 -0.483073 0.373698\n' +
        'v 0.582031 0.527344 0.417969\n' +
        'v 0.582031 -0.527344 0.417969\n' +
        'v 0.567708 0.598958 0.243490\n' +
        'v 0.567708 -0.598958 0.243490\n' +
        'v 0.672743 0.537326 0.242622\n' +
        'v 0.672743 -0.537326 0.242622\n' +
        'v 0.749132 0.473524 0.243273\n' +
        'v 0.749132 -0.473524 0.243273\n' +
        'v 0.780237 0.449798 0.243345\n' +
        'v 0.780237 -0.449797 0.243345\n' +
        'v 0.786820 0.422815 0.314381\n' +
        'v 0.786820 -0.422815 0.314381\n' +
        'v 0.802879 0.352720 0.344039\n' +
        'v 0.802879 -0.352720 0.344039\n' +
        'v 0.815104 0.285012 0.314381\n' +
        'v 0.815104 -0.285012 0.314381\n' +
        'v 0.817419 0.256510 0.243345\n' +
        'v 0.817419 -0.256510 0.243345\n' +
        'v 0.815104 0.285012 0.175637\n' +
        'v 0.815104 -0.285012 0.175637\n' +
        'v 0.818309 0.352264 0.243239\n' +
        'v 0.818309 -0.352264 0.243239\n' +
        'v 0.802879 0.352720 0.147135\n' +
        'v 0.802879 -0.352720 0.147135\n' +
        'v 0.786820 0.422815 0.175637\n' +
        'v 0.786820 -0.422815 0.175637\n' +
        'v 0.735243 0.000000 0.434028\n' +
        'v 0.803030 0.000000 0.353456\n' +
        'v 0.736979 0.000000 -0.654080\n' +
        'v 0.778646 0.000000 -0.301649\n' +
        'v 0.789497 0.000000 -0.171441\n' +
        'v 0.713108 0.000000 -0.762153\n' +
        'v 0.623264 0.000000 0.448061\n' +
        'v 0.532907 0.000000 0.566604\n' +
        'v -0.474392 -0.000000 0.839844\n' +
        'v -0.745660 -0.000000 0.506076\n' +
        'v -0.753906 -0.000000 0.100260\n' +
        'v -0.289931 -0.000000 -0.342448\n' +
        'v 0.580946 0.235026 -0.174045\n' +
        'v 0.580946 -0.235026 -0.174045\n' +
        'v 0.564236 0.281033 -0.444878\n' +
        'v 0.564236 -0.281033 -0.444879\n' +
        'v 0.555773 0.315104 -0.654948\n' +
        'v 0.555773 -0.315104 -0.654948\n' +
        'v 0.532552 0.329861 -0.832465\n' +
        'v 0.532552 -0.329861 -0.832465\n' +
        'v 0.526693 0.293620 -0.924479\n' +
        'v 0.526693 -0.293620 -0.924479\n' +
        'v 0.547092 0.168403 -0.957465\n' +
        'v 0.547092 -0.168403 -0.957465\n' +
        'v 0.562066 0.000000 -0.970486\n' +
        'v 0.550564 0.423177 -0.109375\n' +
        'v 0.550564 -0.423177 -0.109375\n' +
        'v 0.522352 0.622179 -0.004123\n' +
        'v 0.522352 -0.622179 -0.004123\n' +
        'v 0.492188 0.777127 0.173394\n' +
        'v 0.492188 -0.777127 0.173394\n' +
        'v 0.567925 0.803603 0.382378\n' +
        'v 0.567925 -0.803603 0.382378\n' +
        'v 0.624132 0.686415 0.478516\n' +
        'v 0.624132 -0.686415 0.478516\n' +
        'v 0.680339 0.491754 0.588759\n' +
        'v 0.680339 -0.491753 0.588759\n' +
        'v 0.724175 0.323134 0.697266\n' +
        'v 0.724175 -0.323134 0.697266\n' +
        'v 0.745009 0.180122 0.662326\n' +
        'v 0.745009 -0.180122 0.662326\n' +
        'v 0.741754 0.079644 0.501953\n' +
        'v 0.741754 -0.079644 0.501953\n' +
        'v 0.783203 0.167535 0.406250\n' +
        'v 0.783203 -0.167535 0.406250\n' +
        'v 0.776476 0.121962 0.311198\n' +
        'v 0.776476 -0.121962 0.311198\n' +
        'v 0.749349 0.215929 0.065972\n' +
        'v 0.749349 -0.215929 0.065972\n' +
        'v 0.708333 0.370009 0.030599\n' +
        'v 0.708333 -0.370009 0.030599\n' +
        'v 0.672960 0.509115 0.079210\n' +
        'v 0.672960 -0.509115 0.079210\n' +
        'v 0.651910 0.615885 0.190321\n' +
        'v 0.651910 -0.615885 0.190321\n' +
        'v 0.658420 0.639540 0.300564\n' +
        'v 0.658420 -0.639540 0.300564\n' +
        'v 0.685981 0.585938 0.378038\n' +
        'v 0.685981 -0.585938 0.378038\n' +
        'v 0.733941 0.442491 0.445096\n' +
        'v 0.733941 -0.442491 0.445096\n' +
        'v 0.775174 0.245443 0.474826\n' +
        'v 0.775174 -0.245443 0.474826\n' +
        'v 0.732205 0.000000 -0.740885\n' +
        'v 0.722500 0.113750 -0.745313\n' +
        'v 0.722500 -0.113750 -0.745313\n' +
        'v 0.699436 0.123481 -0.835504\n' +
        'v 0.699436 -0.123481 -0.835503\n' +
        'v 0.685330 0.073351 -0.882596\n' +
        'v 0.685330 -0.073351 -0.882596\n' +
        'v 0.680990 0.000000 -0.894097\n' +
        'v 0.765625 0.000000 -0.167411\n' +
        'v 0.751421 0.000000 -0.131629\n' +
        'v 0.756511 0.094401 -0.148003\n' +
        'v 0.756510 -0.094401 -0.148003\n' +
        'v 0.751519 0.123481 -0.224175\n' +
        'v 0.751519 -0.123481 -0.224175\n' +
        'v 0.744844 0.091250 -0.305000\n' +
        'v 0.744844 -0.091250 -0.305000\n' +
        'v 0.665365 0.392361 -0.041884\n' +
        'v 0.665365 -0.392361 -0.041884\n' +
        'v 0.618490 0.587240 0.050130\n' +
        'v 0.618490 -0.587240 0.050130\n' +
        'v 0.599392 0.708333 0.196181\n' +
        'v 0.599392 -0.708333 0.196181\n' +
        'v 0.643446 0.730469 0.349175\n' +
        'v 0.643446 -0.730469 0.349175\n' +
        'v 0.701172 0.649740 0.430990\n' +
        'v 0.701172 -0.649740 0.430990\n' +
        'v 0.760851 0.462457 0.533854\n' +
        'v 0.760851 -0.462457 0.533854\n' +
        'v 0.799913 0.319010 0.613064\n' +
        'v 0.799913 -0.319010 0.613064\n' +
        'v 0.816840 0.205729 0.584635\n' +
        'v 0.816840 -0.205729 0.584635\n' +
        'v 0.814019 0.107639 0.452691\n' +
        'v 0.814019 -0.107639 0.452691\n' +
        'v 0.756155 0.153291 -0.093868\n' +
        'v 0.756155 -0.153291 -0.093868\n' +
        'v 0.690321 0.207465 -0.463976\n' +
        'v 0.690321 -0.207465 -0.463976\n' +
        'v 0.675130 0.240234 -0.675998\n' +
        'v 0.675130 -0.240234 -0.675998\n' +
        'v 0.652995 0.250217 -0.810981\n' +
        'v 0.652995 -0.250217 -0.810981\n' +
        'v 0.632379 0.221354 -0.894748\n' +
        'v 0.632378 -0.221354 -0.894748\n' +
        'v 0.631076 0.138238 -0.927083\n' +
        'v 0.631076 -0.138238 -0.927083\n' +
        'v 0.635417 0.000000 -0.937934\n' +
        'v 0.745028 0.000000 0.039299\n' +
        'v 0.764757 0.000000 0.209635\n' +
        'v 0.759766 0.330512 0.486545\n' +
        'v 0.759766 -0.330512 0.486545\n' +
        'v 0.753906 0.145616 0.131076\n' +
        'v 0.753906 -0.145616 0.131076\n' +
        'v 0.763238 0.120443 0.214627\n' +
        'v 0.763238 -0.120443 0.214627\n' +
        'v 0.728733 0.113932 -0.657335\n' +
        'v 0.728733 -0.113932 -0.657335\n' +
        'v 0.739583 0.092665 -0.461589\n' +
        'v 0.739583 -0.092665 -0.461589\n' +
        'v 0.746094 0.000000 -0.463108\n' +
        'v 0.750000 0.000000 -0.335070\n' +
        'v 0.781250 0.081163 -0.271918\n' +
        'v 0.781250 -0.081163 -0.271918\n' +
        'v 0.789280 0.117622 -0.219618\n' +
        'v 0.789280 -0.117622 -0.219618\n' +
        'v 0.782335 0.097222 -0.152561\n' +
        'v 0.782335 -0.097222 -0.152561\n' +
        'v 0.782335 0.040148 -0.142795\n' +
        'v 0.782335 -0.040148 -0.142795\n' +
        'v 0.820313 0.000000 -0.201231\n' +
        'v 0.808594 0.048828 -0.159180\n' +
        'v 0.808594 -0.048828 -0.159180\n' +
        'v 0.808594 0.086589 -0.166341\n' +
        'v 0.808594 -0.086589 -0.166341\n' +
        'v 0.816623 0.089410 -0.217014\n' +
        'v 0.816623 -0.089410 -0.217014\n' +
        'v 0.804362 0.068685 -0.256510\n' +
        'v 0.804362 -0.068685 -0.256510\n' +
        'v 0.804688 0.000000 -0.269965\n' +
        'v 0.562066 0.242405 -0.316406\n' +
        'v 0.562066 -0.242405 -0.316406\n' +
        'v 0.702474 0.164714 -0.232639\n' +
        'v 0.702474 -0.164714 -0.232639\n' +
        'v 0.690972 0.180556 -0.319879\n' +
        'v 0.690972 -0.180556 -0.319879\n' +
        'v 0.569878 0.217231 -0.242839\n' +
        'v 0.569879 -0.217231 -0.242839\n' +
        'v 0.678819 0.000000 -0.872396\n' +
        'v 0.682726 0.049262 -0.860894\n' +
        'v 0.682726 -0.049262 -0.860894\n' +
        'v 0.699002 0.089410 -0.815538\n' +
        'v 0.699002 -0.089410 -0.815538\n' +
        'v 0.713325 0.080512 -0.758898\n' +
        'v 0.713325 -0.080512 -0.758898\n' +
        'v 0.664931 0.000000 -0.783854\n' +
        'v 0.665509 0.072483 -0.777995\n' +
        'v 0.665509 -0.072483 -0.777995\n' +
        'v 0.660699 0.083333 -0.808919\n' +
        'v 0.660699 -0.083333 -0.808919\n' +
        'v 0.647931 0.051649 -0.835069\n' +
        'v 0.647931 -0.051649 -0.835069\n' +
        'v 0.646267 0.000000 -0.845052\n' +
        'v 0.771484 0.172743 0.221571\n' +
        'v 0.771484 -0.172743 0.221571\n' +
        'v 0.767578 0.189887 0.158854\n' +
        'v 0.767578 -0.189887 0.158854\n' +
        'v 0.757595 0.338542 0.427300\n' +
        'v 0.757596 -0.338542 0.427300\n' +
        'v 0.768012 0.270833 0.419271\n' +
        'v 0.768012 -0.270833 0.419271\n' +
        'v 0.747179 0.430990 0.400174\n' +
        'v 0.747179 -0.430990 0.400174\n' +
        'v 0.698134 0.544488 0.350694\n' +
        'v 0.698134 -0.544488 0.350695\n' +
        'v 0.679036 0.583984 0.284288\n' +
        'v 0.679036 -0.583984 0.284288\n' +
        'v 0.679905 0.564887 0.195530\n' +
        'v 0.679905 -0.564887 0.195530\n' +
        'v 0.706597 0.476997 0.107639\n' +
        'v 0.706597 -0.476997 0.107639\n' +
        'v 0.735243 0.366971 0.073568\n' +
        'v 0.735243 -0.366970 0.073568\n' +
        'v 0.763672 0.243707 0.108724\n' +
        'v 0.763672 -0.243707 0.108724\n' +
        'v 0.774523 0.178168 0.298394\n' +
        'v 0.774523 -0.178168 0.298394\n' +
        'v 0.774740 0.212023 0.373264\n' +
        'v 0.774740 -0.212023 0.373264\n' +
        'v 0.759115 0.235677 0.355469\n' +
        'v 0.759115 -0.235677 0.355469\n' +
        'v 0.756510 0.201823 0.295573\n' +
        'v 0.756510 -0.201823 0.295573\n' +
        'v 0.751302 0.257813 0.126302\n' +
        'v 0.751302 -0.257812 0.126302\n' +
        'v 0.727865 0.367188 0.097656\n' +
        'v 0.727865 -0.367188 0.097656\n' +
        'v 0.701823 0.460938 0.127604\n' +
        'v 0.701823 -0.460938 0.127604\n' +
        'v 0.677083 0.533854 0.207031\n' +
        'v 0.677083 -0.533854 0.207031\n' +
        'v 0.673177 0.549479 0.278646\n' +
        'v 0.673177 -0.549479 0.278646\n' +
        'v 0.690104 0.515625 0.335938\n' +
        'v 0.690104 -0.515625 0.335938\n' +
        'v 0.738281 0.420573 0.384115\n' +
        'v 0.738281 -0.420573 0.384115\n' +
        'v 0.761719 0.282552 0.393229\n' +
        'v 0.761719 -0.282552 0.393229\n' +
        'v 0.752604 0.339844 0.402344\n' +
        'v 0.752604 -0.339844 0.402344\n' +
        'v 0.751302 0.208333 0.173177\n' +
        'v 0.751302 -0.208333 0.173177\n' +
        'v 0.751302 0.196615 0.229167\n' +
        'v 0.751302 -0.196615 0.229167\n' +
        'v 0.614531 0.133854 0.502240\n' +
        'v 0.614531 -0.133854 0.502240\n' +
        'v 0.643229 0.209635 0.635417\n' +
        'v 0.643229 -0.209635 0.635417\n' +
        'v 0.625977 0.324219 0.661458\n' +
        'v 0.625977 -0.324219 0.661458\n' +
        'v 0.558906 0.445625 0.554063\n' +
        'v 0.558906 -0.445625 0.554063\n' +
        'v 0.489149 0.664279 0.466797\n' +
        'v 0.489149 -0.664280 0.466797\n' +
        'v 0.443576 0.775825 0.378689\n' +
        'v 0.443576 -0.775825 0.378689\n' +
        'v 0.362196 0.767795 0.181424\n' +
        'v 0.362196 -0.767795 0.181424\n' +
        'v 0.378255 0.623915 0.000217\n' +
        'v 0.378255 -0.623915 0.000217\n' +
        'v 0.440990 0.408958 -0.118125\n' +
        'v 0.440990 -0.408958 -0.118125\n' +
        'v 0.255208 0.000000 0.842014\n' +
        'v -0.087240 -0.000000 0.939236\n' +
        'v -0.601128 -0.000000 -0.168837\n' +
        'v 0.111545 0.000000 -0.428385\n' +
        'v 0.455729 0.000000 -0.938802\n' +
        'v 0.365451 0.000000 -0.780382\n' +
        'v 0.326389 0.000000 -0.581597\n' +
        'v 0.267795 0.000000 -0.473524\n' +
        'v 0.131727 0.803385 0.224826\n' +
        'v 0.131727 -0.803385 0.224826\n' +
        'v -0.050000 0.825469 0.292500\n' +
        'v -0.050000 -0.825469 0.292500\n' +
        'v -0.409063 0.757500 0.290469\n' +
        'v -0.409063 -0.757500 0.290469\n' +
        'v -0.654297 0.392361 0.442274\n' +
        'v -0.654297 -0.392361 0.442274\n' +
        'v 0.074062 0.685938 -0.025000\n' +
        'v 0.074063 -0.685938 -0.025000\n' +
        'v -0.170000 0.625313 -0.102500\n' +
        'v -0.170000 -0.625313 -0.102500\n' +
        'v -0.391276 0.652561 0.011285\n' +
        'v -0.391276 -0.652561 0.011285\n' +
        'v -0.660735 0.320457 0.085503\n' +
        'v -0.660735 -0.320457 0.085503\n' +
        'v 0.409505 0.237196 -0.391493\n' +
        'v 0.409505 -0.237196 -0.391493\n' +
        'v 0.286024 0.156250 -0.430556\n' +
        'v 0.286024 -0.156250 -0.430556\n' +
        'v 0.410156 0.276042 -0.743056\n' +
        'v 0.410156 -0.276042 -0.743056\n' +
        'v 0.412543 0.250000 -0.546875\n' +
        'v 0.412543 -0.250000 -0.546875\n' +
        'v 0.433919 0.281901 -0.885417\n' +
        'v 0.433919 -0.281901 -0.885417\n' +
        'v 0.376085 0.142795 -0.752387\n' +
        'v 0.376085 -0.142795 -0.752387\n' +
        'v 0.347439 0.133464 -0.554036\n' +
        'v 0.347439 -0.133464 -0.554036\n' +
        'v 0.443142 0.162109 -0.917752\n' +
        'v 0.443142 -0.162109 -0.917752\n' +
        'v 0.396198 0.243854 -0.286406\n' +
        'v 0.396198 -0.243854 -0.286406\n' +
        'v 0.473814 0.247251 -0.212457\n' +
        'v 0.473814 -0.247251 -0.212457\n' +
        'v 0.502713 0.257921 -0.172201\n' +
        'v 0.502713 -0.257921 -0.172201\n' +
        'v 0.150104 0.212448 -0.360469\n' +
        'v 0.150104 -0.212448 -0.360469\n' +
        'v -0.246745 0.266059 -0.285373\n' +
        'v -0.246745 -0.266059 -0.285373\n' +
        'v -0.533131 0.299624 -0.128472\n' +
        'v -0.533131 -0.299624 -0.128472\n' +
        'v -0.413846 0.409071 0.785590\n' +
        'v -0.413846 -0.409071 0.785590\n' +
        'v -0.096137 0.408854 0.885200\n' +
        'v -0.096137 -0.408854 0.885200\n' +
        'v 0.198351 0.409505 0.794488\n' +
        'v 0.198351 -0.409505 0.794488\n' +
        'v 0.413411 0.419054 0.572483\n' +
        'v 0.413411 -0.419054 0.572483\n' +
        'v 0.276042 0.746962 0.410156\n' +
        'v 0.276042 -0.746962 0.410156\n' +
        'v 0.309028 0.630208 0.499132\n' +
        'v 0.309028 -0.630208 0.499132\n' +
        'v 0.089844 0.632813 0.672092\n' +
        'v 0.089844 -0.632813 0.672092\n' +
        'v 0.078993 0.771918 0.526476\n' +
        'v 0.078993 -0.771918 0.526476\n' +
        'v -0.146701 0.774523 0.571181\n' +
        'v -0.146701 -0.774523 0.571181\n' +
        'v -0.161675 0.635417 0.737196\n' +
        'v -0.161675 -0.635417 0.737196\n' +
        'v -0.404080 0.632378 0.640625\n' +
        'v -0.404080 -0.632378 0.640625\n' +
        'v -0.342448 0.753906 0.521159\n' +
        'v -0.342448 -0.753906 0.521159\n' +
        'v -0.548394 0.598307 0.342448\n' +
        'v -0.548394 -0.598307 0.342448\n' +
        'v -0.510885 0.481823 0.019062\n' +
        'v -0.510885 -0.481823 0.019063\n' +
        'v -0.206250 0.826719 0.356875\n' +
        'v -0.206250 -0.826719 0.356875\n' +
        'v 0.161979 0.405260 -0.185469\n' +
        'v 0.161979 -0.405260 -0.185469\n' +
        'v -0.206163 0.442491 -0.168403\n' +
        'v -0.206163 -0.442491 -0.168403\n' +
        'v -0.267795 0.900174 0.391493\n' +
        'v -0.267795 -0.900174 0.391493\n' +
        'v -0.200304 0.800130 -0.113715\n' +
        'v -0.200304 -0.800130 -0.113715\n' +
        'v -0.334853 1.035156 -0.070313\n' +
        'v -0.334852 -1.035156 -0.070313\n' +
        'v -0.425781 1.246094 0.076172\n' +
        'v -0.425781 -1.246094 0.076172\n' +
        'v -0.434896 1.310547 0.298828\n' +
        'v -0.434896 -1.310547 0.298828\n' +
        'v -0.419922 1.213108 0.454861\n' +
        'v -0.419922 -1.213108 0.454861\n' +
        'v -0.340495 1.034722 0.453776\n' +
        'v -0.340495 -1.034722 0.453776\n' +
        'v -0.309245 1.031033 0.407552\n' +
        'v -0.309245 -1.031033 0.407552\n' +
        'v -0.389106 1.177300 0.407552\n' +
        'v -0.389106 -1.177300 0.407552\n' +
        'v -0.413629 1.251736 0.277344\n' +
        'v -0.413628 -1.251736 0.277344\n' +
        'v -0.400174 1.197266 0.092014\n' +
        'v -0.400174 -1.197266 0.092014\n' +
        'v -0.306207 1.030382 -0.028212\n' +
        'v -0.306207 -1.030382 -0.028212\n' +
        'v -0.180773 0.843316 -0.063151\n' +
        'v -0.180773 -0.843316 -0.063151\n' +
        'v -0.242622 0.924696 0.355469\n' +
        'v -0.242622 -0.924696 0.355469\n' +
        'v -0.294705 0.946398 0.307726\n' +
        'v -0.294705 -0.946398 0.307726\n' +
        'v -0.243056 0.888455 -0.023872\n' +
        'v -0.243056 -0.888455 -0.023872\n' +
        'v -0.352648 1.037543 0.005642\n' +
        'v -0.352648 -1.037543 0.005642\n' +
        'v -0.432292 1.177300 0.101345\n' +
        'v -0.432292 -1.177300 0.101345\n' +
        'v -0.444879 1.224392 0.246745\n' +
        'v -0.444878 -1.224393 0.246745\n' +
        'v -0.425564 1.162760 0.347873\n' +
        'v -0.425564 -1.162760 0.347873\n' +
        'v -0.358507 1.036458 0.348741\n' +
        'v -0.358507 -1.036458 0.348741\n' +
        'v -0.217014 0.854167 0.287760\n' +
        'v -0.217014 -0.854167 0.287760\n' +
        'v -0.269314 0.826389 0.173611\n' +
        'v -0.269314 -0.826389 0.173611\n' +
        'v -0.269965 0.777778 0.098090\n' +
        'v -0.269965 -0.777778 0.098090\n' +
        'v -0.281576 0.809896 0.069661\n' +
        'v -0.281576 -0.809896 0.069661\n' +
        'v -0.268880 0.817491 0.024523\n' +
        'v -0.268880 -0.817491 0.024523\n' +
        'v -0.255208 0.814236 -0.013021\n' +
        'v -0.255208 -0.814236 -0.013021\n' +
        'v -0.081453 0.742043 0.040943\n' +
        'v -0.081453 -0.742043 0.040943\n' +
        'v -0.165833 0.732865 -0.029271\n' +
        'v -0.165833 -0.732865 -0.029271\n' +
        'v -0.193958 0.747865 0.054010\n' +
        'v -0.193958 -0.747865 0.054010\n' +
        'v -0.196181 0.804905 0.199870\n' +
        'v -0.196181 -0.804905 0.199870\n' +
        'v -0.269965 0.884115 0.247179\n' +
        'v -0.269965 -0.884115 0.247179\n' +
        'v -0.319879 0.903646 0.224175\n' +
        'v -0.319878 -0.903646 0.224175\n' +
        'v -0.297526 0.840169 -0.006185\n' +
        'v -0.297526 -0.840169 -0.006185\n' +
        'v -0.312934 0.853299 0.027127\n' +
        'v -0.312934 -0.853299 0.027127\n' +
        'v -0.313802 0.831814 0.078125\n' +
        'v -0.313802 -0.831814 0.078125\n' +
        'v -0.308919 0.798177 0.107747\n' +
        'v -0.308919 -0.798177 0.107747\n' +
        'v -0.314019 0.846354 0.160373\n' +
        'v -0.314019 -0.846354 0.160373\n' +
        'v -0.401910 1.051722 0.318432\n' +
        'v -0.401910 -1.051722 0.318432\n' +
        'v -0.453125 1.158059 0.317564\n' +
        'v -0.453125 -1.158059 0.317564\n' +
        'v -0.465278 1.210938 0.231988\n' +
        'v -0.465278 -1.210938 0.231988\n' +
        'v -0.452474 1.165148 0.112630\n' +
        'v -0.452474 -1.165148 0.112630\n' +
        'v -0.390625 1.037326 0.030599\n' +
        'v -0.390625 -1.037326 0.030599\n' +
        'v -0.298177 0.904080 -0.000868\n' +
        'v -0.298177 -0.904080 -0.000868\n' +
        'v -0.346137 0.965929 0.279514\n' +
        'v -0.346137 -0.965929 0.279514\n' +
        'v -0.330295 0.889974 0.115451\n' +
        'v -0.330295 -0.889974 0.115451\n' +
        'v -0.330946 0.920790 0.060330\n' +
        'v -0.330946 -0.920790 0.060330\n' +
        'v -0.369358 1.000000 0.113932\n' +
        'v -0.369358 -1.000000 0.113932\n' +
        'v -0.349175 0.954210 0.174262\n' +
        'v -0.349175 -0.954210 0.174262\n' +
        'v -0.371311 1.014106 0.231554\n' +
        'v -0.371311 -1.014106 0.231554\n' +
        'v -0.395833 1.071398 0.175347\n' +
        'v -0.395833 -1.071398 0.175347\n' +
        'v -0.413411 1.124674 0.223958\n' +
        'v -0.413411 -1.124675 0.223958\n' +
        'v -0.404297 1.087529 0.274378\n' +
        'v -0.404297 -1.087529 0.274378\n' +
        'v -0.450087 1.035807 0.355903\n' +
        'v -0.450087 -1.035807 0.355903\n' +
        'v -0.507017 1.235388 0.379774\n' +
        'v -0.507017 -1.235388 0.379774\n' +
        'v -0.494900 1.324436 0.286784\n' +
        'v -0.494900 -1.324436 0.286784\n' +
        'v -0.503762 1.263166 0.131727\n' +
        'v -0.503762 -1.263166 0.131727\n' +
        'v -0.445747 1.040148 0.012587\n' +
        'v -0.445746 -1.040148 0.012587\n' +
        'v -0.343967 0.814019 -0.025825\n' +
        'v -0.343967 -0.814019 -0.025825\n' +
        'v -0.375000 0.866103 0.299262\n' +
        'v -0.375000 -0.866102 0.299262\n' +
        'v 0.716797 0.501356 0.242866\n' +
        'v 0.751248 0.464654 0.197862\n' +
        'v 0.726617 0.458035 0.139079\n' +
        'v 0.676053 0.523058 0.172363\n' +
        'v 0.676053 -0.523058 0.172363\n' +
        'v 0.726617 -0.458035 0.139079\n' +
        'v 0.751248 -0.464654 0.197862\n' +
        'v 0.716797 -0.501356 0.242866\n' +
        'v 0.621853 0.569770 0.242893\n' +
        'v 0.635417 0.506185 0.091092\n' +
        'v 0.571452 0.580241 0.150879\n' +
        'v 0.571452 -0.580241 0.150879\n' +
        'v 0.635417 -0.506185 0.091092\n' +
        'v 0.621853 -0.569770 0.242893\n' +
        'v 0.697456 0.422716 0.073242\n' +
        'v 0.665880 0.351590 0.028212\n' +
        'v 0.597982 0.446777 0.021159\n' +
        'v 0.597982 -0.446777 0.021159\n' +
        'v 0.665880 -0.351590 0.028212\n' +
        'v 0.697456 -0.422716 0.073242\n' +
        'v 0.765137 0.399251 0.134847\n' +
        'v 0.747694 0.352214 0.096354\n' +
        'v 0.747694 -0.352214 0.096354\n' +
        'v 0.765137 -0.399251 0.134847\n' +
        'v 0.782796 0.307237 0.134847\n' +
        'v 0.764811 0.248318 0.139079\n' +
        'v 0.723362 0.281087 0.073242\n' +
        'v 0.723362 -0.281087 0.073242\n' +
        'v 0.764811 -0.248318 0.139079\n' +
        'v 0.782796 -0.307237 0.134847\n' +
        'v 0.690620 0.197076 0.091092\n' +
        'v 0.632161 0.256348 0.021159\n' +
        'v 0.632161 -0.256348 0.021159\n' +
        'v 0.690620 -0.197076 0.091092\n' +
        'v 0.735813 0.181342 0.172363\n' +
        'v 0.697211 0.133518 0.242893\n' +
        'v 0.651530 0.122884 0.150879\n' +
        'v 0.651530 -0.122884 0.150879\n' +
        'v 0.697211 -0.133518 0.242893\n' +
        'v 0.735813 -0.181342 0.172363\n' +
        'v 0.791314 0.244222 0.197862\n' +
        'v 0.768175 0.205566 0.242866\n' +
        'v 0.768175 -0.205566 0.242866\n' +
        'v 0.791314 -0.244222 0.197862\n' +
        'v 0.791314 0.244222 0.289903\n' +
        'v 0.764811 0.248318 0.348687\n' +
        'v 0.735813 0.181342 0.313368\n' +
        'v 0.735813 -0.181342 0.313368\n' +
        'v 0.764811 -0.248318 0.348687\n' +
        'v 0.791314 -0.244222 0.289903\n' +
        'v 0.690620 0.197076 0.396810\n' +
        'v 0.651530 0.122884 0.337565\n' +
        'v 0.651530 -0.122884 0.337565\n' +
        'v 0.690620 -0.197076 0.396810\n' +
        'v 0.723362 0.281087 0.413683\n' +
        'v 0.665880 0.351590 0.460395\n' +
        'v 0.632161 0.256348 0.470866\n' +
        'v 0.632161 -0.256348 0.470866\n' +
        'v 0.665880 -0.351590 0.460395\n' +
        'v 0.723362 -0.281087 0.413683\n' +
        'v 0.782796 0.307237 0.355903\n' +
        'v 0.747694 0.352214 0.392090\n' +
        'v 0.747694 -0.352214 0.392090\n' +
        'v 0.782796 -0.307237 0.355903\n' +
        'v 0.765137 0.399251 0.355903\n' +
        'v 0.726617 0.458035 0.348687\n' +
        'v 0.697456 0.422716 0.413683\n' +
        'v 0.697456 -0.422716 0.413683\n' +
        'v 0.726617 -0.458035 0.348687\n' +
        'v 0.765137 -0.399251 0.355903\n' +
        'v 0.635417 0.506185 0.396810\n' +
        'v 0.597982 0.446777 0.470866\n' +
        'v 0.597982 -0.446777 0.470866\n' +
        'v 0.635417 -0.506185 0.396810\n' +
        'v 0.676053 0.523058 0.313368\n' +
        'v 0.571452 0.580241 0.337565\n' +
        'v 0.571452 -0.580241 0.337565\n' +
        'v 0.676053 -0.523058 0.313368\n' +
        'v 0.751248 0.464654 0.289903\n' +
        'v 0.751248 -0.464654 0.289903\n' +
        'v 0.767343 0.462095 0.243444\n' +
        'v 0.774514 0.431460 0.322718\n' +
        'v 0.781404 0.444182 0.281901\n' +
        'v 0.781404 -0.444182 0.281901\n' +
        'v 0.774513 -0.431460 0.322718\n' +
        'v 0.767343 -0.462095 0.243444\n' +
        'v 0.791386 0.352819 0.355234\n' +
        'v 0.794090 0.391159 0.337475\n' +
        'v 0.794090 -0.391159 0.337475\n' +
        'v 0.791386 -0.352819 0.355234\n' +
        'v 0.804986 0.277299 0.322718\n' +
        'v 0.810068 0.315430 0.337475\n' +
        'v 0.810068 -0.315430 0.337475\n' +
        'v 0.804986 -0.277299 0.322718\n' +
        'v 0.807581 0.246040 0.243444\n' +
        'v 0.817057 0.263003 0.281901\n' +
        'v 0.817057 -0.263003 0.281901\n' +
        'v 0.807581 -0.246040 0.243444\n' +
        'v 0.804986 0.277299 0.167924\n' +
        'v 0.817057 0.263003 0.206055\n' +
        'v 0.817057 -0.263003 0.206055\n' +
        'v 0.804986 -0.277299 0.167924\n' +
        'v 0.791386 0.352819 0.136665\n' +
        'v 0.810068 0.315430 0.153628\n' +
        'v 0.810068 -0.315430 0.153628\n' +
        'v 0.791386 -0.352819 0.136665\n' +
        'v 0.774514 0.431460 0.167924\n' +
        'v 0.794090 0.391159 0.153628\n' +
        'v 0.794090 -0.391159 0.153628\n' +
        'v 0.774514 -0.431460 0.167924\n' +
        'v 0.781404 0.444182 0.206055\n' +
        'v 0.781404 -0.444182 0.206055\n' +
        'v 0.796767 0.417707 0.243141\n' +
        'v 0.801297 0.399450 0.197315\n' +
        'v 0.796767 -0.417707 0.243141\n' +
        'v 0.801297 -0.399450 0.197315\n' +
        'v 0.812292 0.352476 0.178001\n' +
        'v 0.812292 -0.352476 0.178001\n' +
        'v 0.820566 0.306668 0.197315\n' +
        'v 0.820566 -0.306668 0.197315\n' +
        'v 0.822320 0.287354 0.243141\n' +
        'v 0.822320 -0.287354 0.243141\n' +
        'v 0.820566 0.306668 0.290939\n' +
        'v 0.820566 -0.306668 0.290939\n' +
        'v 0.812292 0.352476 0.311085\n' +
        'v 0.812292 -0.352476 0.311085\n' +
        'v 0.801297 0.399450 0.290939\n' +
        'v 0.801297 -0.399450 0.290939\n' +
        'v 0.557590 0.086480 -0.966580\n' +
        'v 0.592584 0.159424 -0.946994\n' +
        'v 0.633898 0.073432 -0.934788\n' +
        'v 0.602810 0.000000 -0.958279\n' +
        'v 0.633898 -0.073432 -0.934787\n' +
        'v 0.592584 -0.159424 -0.946994\n' +
        'v 0.557590 -0.086480 -0.966580\n' +
        'v 0.535102 0.240370 -0.945204\n' +
        'v 0.582872 0.266032 -0.917833\n' +
        'v 0.629612 0.187527 -0.915717\n' +
        'v 0.629612 -0.187527 -0.915717\n' +
        'v 0.582872 -0.266032 -0.917833\n' +
        'v 0.535102 -0.240370 -0.945204\n' +
        'v 0.525960 0.321588 -0.888563\n' +
        'v 0.597900 0.303467 -0.836779\n' +
        'v 0.641141 0.241564 -0.858724\n' +
        'v 0.641140 -0.241564 -0.858724\n' +
        'v 0.597901 -0.303467 -0.836779\n' +
        'v 0.525960 -0.321587 -0.888563\n' +
        'v 0.544244 0.326226 -0.753310\n' +
        'v 0.623101 0.292074 -0.678087\n' +
        'v 0.664551 0.249295 -0.753744\n' +
        'v 0.664551 -0.249295 -0.753744\n' +
        'v 0.623101 -0.292074 -0.678087\n' +
        'v 0.544244 -0.326226 -0.753310\n' +
        'v 0.562364 0.299615 -0.545682\n' +
        'v 0.634847 0.256863 -0.460775\n' +
        'v 0.684353 0.224908 -0.571208\n' +
        'v 0.684353 -0.224908 -0.571208\n' +
        'v 0.634847 -0.256863 -0.460775\n' +
        'v 0.562364 -0.299615 -0.545682\n' +
        'v 0.665062 0.208736 -0.149290\n' +
        'v 0.568197 0.315186 -0.143338\n' +
        'v 0.611464 0.409560 -0.082872\n' +
        'v 0.707379 0.276214 -0.067246\n' +
        'v 0.707379 -0.276213 -0.067246\n' +
        'v 0.611464 -0.409559 -0.082872\n' +
        'v 0.568197 -0.315186 -0.143338\n' +
        'v 0.665062 -0.208736 -0.149291\n' +
        'v 0.537923 0.526666 -0.064480\n' +
        'v 0.574246 0.613091 0.019911\n' +
        'v 0.637533 0.497450 -0.003364\n' +
        'v 0.637533 -0.497450 -0.003364\n' +
        'v 0.574246 -0.613091 0.019911\n' +
        'v 0.537923 -0.526666 -0.064480\n' +
        'v 0.498888 0.710070 0.074870\n' +
        'v 0.549045 0.752577 0.185357\n' +
        'v 0.602919 0.659017 0.117703\n' +
        'v 0.602919 -0.659017 0.117703\n' +
        'v 0.549045 -0.752577 0.185357\n' +
        'v 0.498888 -0.710070 0.074870\n' +
        'v 0.523139 0.809408 0.285780\n' +
        'v 0.613824 0.776720 0.370741\n' +
        'v 0.615804 0.731608 0.279107\n' +
        'v 0.615804 -0.731608 0.279107\n' +
        'v 0.613824 -0.776720 0.370741\n' +
        'v 0.523139 -0.809408 0.285780\n' +
        'v 0.599691 0.760471 0.439155\n' +
        'v 0.674452 0.674832 0.460368\n' +
        'v 0.671983 0.705729 0.393907\n' +
        'v 0.671984 -0.705729 0.393907\n' +
        'v 0.674452 -0.674832 0.460368\n' +
        'v 0.599691 -0.760471 0.439155\n' +
        'v 0.651828 0.591119 0.527941\n' +
        'v 0.733860 0.478651 0.570991\n' +
        'v 0.732069 0.559923 0.479492\n' +
        'v 0.732069 -0.559923 0.479492\n' +
        'v 0.733860 -0.478651 0.570991\n' +
        'v 0.651828 -0.591119 0.527941\n' +
        'v 0.704861 0.403131 0.652452\n' +
        'v 0.776449 0.319038 0.668674\n' +
        'v 0.783474 0.383328 0.582330\n' +
        'v 0.783474 -0.383328 0.582330\n' +
        'v 0.776449 -0.319038 0.668674\n' +
        'v 0.704861 -0.403130 0.652452\n' +
        'v 0.737847 0.247477 0.702176\n' +
        'v 0.795329 0.187880 0.634874\n' +
        'v 0.810981 0.260417 0.615533\n' +
        'v 0.810981 -0.260417 0.615533\n' +
        'v 0.795329 -0.187880 0.634874\n' +
        'v 0.737847 -0.247477 0.702176\n' +
        'v 0.745416 0.125244 0.584012\n' +
        'v 0.791151 0.086887 0.482124\n' +
        'v 0.817627 0.154894 0.522244\n' +
        'v 0.817627 -0.154894 0.522244\n' +
        'v 0.791151 -0.086887 0.482123\n' +
        'v 0.745416 -0.125244 0.584012\n' +
        'v 0.737359 0.038764 0.450494\n' +
        'v 0.782401 0.000000 0.410198\n' +
        'v 0.807711 0.061944 0.399104\n' +
        'v 0.807711 -0.061944 0.399104\n' +
        'v 0.737359 -0.038764 0.450494\n' +
        'v 0.803657 0.136936 0.427192\n' +
        'v 0.780735 0.204454 0.446072\n' +
        'v 0.801053 0.226318 0.526476\n' +
        'v 0.801053 -0.226318 0.526476\n' +
        'v 0.780735 -0.204454 0.446072\n' +
        'v 0.803657 -0.136936 0.427192\n' +
        'v 0.768039 0.286838 0.488336\n' +
        'v 0.784804 0.323866 0.546143\n' +
        'v 0.784804 -0.323866 0.546143\n' +
        'v 0.768039 -0.286838 0.488336\n' +
        'v 0.749702 0.380317 0.470947\n' +
        'v 0.751302 0.450521 0.487603\n' +
        'v 0.751302 -0.450521 0.487603\n' +
        'v 0.749702 -0.380317 0.470947\n' +
        'v 0.710205 0.518202 0.412950\n' +
        'v 0.697320 0.617350 0.401910\n' +
        'v 0.697320 -0.617350 0.401910\n' +
        'v 0.710205 -0.518202 0.412950\n' +
        'v 0.669027 0.624864 0.342150\n' +
        'v 0.653944 0.681993 0.322917\n' +
        'v 0.653944 -0.681993 0.322917\n' +
        'v 0.669027 -0.624864 0.342150\n' +
        'v 0.652073 0.637885 0.248861\n' +
        'v 0.631510 0.659180 0.195285\n' +
        'v 0.631510 -0.659180 0.195285\n' +
        'v 0.652072 -0.637885 0.248861\n' +
        'v 0.659749 0.569824 0.130859\n' +
        'v 0.649713 0.547201 0.067925\n' +
        'v 0.649713 -0.547201 0.067925\n' +
        'v 0.659749 -0.569824 0.130859\n' +
        'v 0.688775 0.443387 0.044000\n' +
        'v 0.693685 0.378499 -0.002387\n' +
        'v 0.693685 -0.378499 -0.002387\n' +
        'v 0.688775 -0.443386 0.044000\n' +
        'v 0.731527 0.288086 0.040880\n' +
        'v 0.755652 0.186885 0.005590\n' +
        'v 0.755651 -0.186885 0.005590\n' +
        'v 0.731527 -0.288086 0.040880\n' +
        'v 0.754313 0.170681 0.096408\n' +
        'v 0.748690 0.089274 0.094936\n' +
        'v 0.759618 0.080060 -0.023837\n' +
        'v 0.759618 -0.080060 -0.023837\n' +
        'v 0.748690 -0.089274 0.094936\n' +
        'v 0.754313 -0.170681 0.096408\n' +
        'v 0.781386 0.139214 0.360189\n' +
        'v 0.790241 0.072361 0.325644\n' +
        'v 0.790241 -0.072361 0.325644\n' +
        'v 0.781386 -0.139214 0.360189\n' +
        'v 0.770101 0.116726 0.262017\n' +
        'v 0.782998 0.000000 0.274511\n' +
        'v 0.763265 0.066325 0.211236\n' +
        'v 0.763265 -0.066325 0.211236\n' +
        'v 0.770101 -0.116726 0.262017\n' +
        'v 0.750060 0.000000 0.141309\n' +
        'v 0.757026 0.129937 0.170654\n' +
        'v 0.757026 -0.129937 0.170654\n' +
        'v 0.663574 0.105062 -0.903456\n' +
        'v 0.682021 0.037977 -0.891520\n' +
        'v 0.662598 0.000000 -0.914551\n' +
        'v 0.682020 -0.037977 -0.891520\n' +
        'v 0.663574 -0.105062 -0.903456\n' +
        'v 0.672825 0.168593 -0.863254\n' +
        'v 0.691162 0.103217 -0.865153\n' +
        'v 0.691162 -0.103217 -0.865153\n' +
        'v 0.672824 -0.168593 -0.863254\n' +
        'v 0.694359 0.184592 -0.775513\n' +
        'v 0.709889 0.129647 -0.792508\n' +
        'v 0.709889 -0.129647 -0.792508\n' +
        'v 0.694359 -0.184592 -0.775513\n' +
        'v 0.723660 0.149333 -0.462864\n' +
        'v 0.734809 0.103461 -0.565158\n' +
        'v 0.709663 0.177572 -0.666178\n' +
        'v 0.709663 -0.177572 -0.666179\n' +
        'v 0.734809 -0.103461 -0.565158\n' +
        'v 0.723660 -0.149333 -0.462864\n' +
        'v 0.724877 0.117386 -0.712159\n' +
        'v 0.724877 -0.117386 -0.712159\n' +
        'v 0.740570 0.088290 -0.375465\n' +
        'v 0.749467 0.043300 -0.327329\n' +
        'v 0.746582 0.000000 -0.384928\n' +
        'v 0.745280 0.043810 -0.462267\n' +
        'v 0.745280 -0.043810 -0.462267\n' +
        'v 0.749467 -0.043300 -0.327329\n' +
        'v 0.740570 -0.088290 -0.375465\n' +
        'v 0.735948 0.055257 -0.654161\n' +
        'v 0.742025 0.000000 -0.562500\n' +
        'v 0.735948 -0.055257 -0.654161\n' +
        'v 0.734429 0.000000 -0.711480\n' +
        'v 0.731414 0.054262 -0.736464\n' +
        'v 0.731414 -0.054262 -0.736464\n' +
        'v 0.747582 0.115566 -0.260462\n' +
        'v 0.769748 0.119005 -0.221490\n' +
        'v 0.786160 0.106391 -0.248454\n' +
        'v 0.763627 0.082254 -0.281105\n' +
        'v 0.763627 -0.082254 -0.281105\n' +
        'v 0.786160 -0.106391 -0.248454\n' +
        'v 0.769748 -0.119005 -0.221490\n' +
        'v 0.747582 -0.115566 -0.260462\n' +
        'v 0.755398 0.117079 -0.184218\n' +
        'v 0.765110 0.095242 -0.152805\n' +
        'v 0.786784 0.114258 -0.183729\n' +
        'v 0.786784 -0.114258 -0.183729\n' +
        'v 0.765110 -0.095242 -0.152805\n' +
        'v 0.755398 -0.117079 -0.184218\n' +
        'v 0.753359 0.054782 -0.126551\n' +
        'v 0.764481 0.028795 -0.142542\n' +
        'v 0.780545 0.069417 -0.138482\n' +
        'v 0.780545 -0.069417 -0.138482\n' +
        'v 0.764481 -0.028795 -0.142542\n' +
        'v 0.753359 -0.054782 -0.126551\n' +
        'v 0.760589 0.000000 -0.160093\n' +
        'v 0.772135 0.000000 -0.170247\n' +
        'v 0.786811 0.017714 -0.160373\n' +
        'v 0.786811 -0.017714 -0.160373\n' +
        'v 0.762370 0.000000 -0.312012\n' +
        'v 0.778971 0.043837 -0.292399\n' +
        'v 0.778971 -0.043837 -0.292399\n' +
        'v 0.792643 0.000000 -0.289225\n' +
        'v 0.795454 0.076623 -0.263310\n' +
        'v 0.804636 0.040992 -0.264544\n' +
        'v 0.804636 -0.040991 -0.264544\n' +
        'v 0.795454 -0.076622 -0.263310\n' +
        'v 0.806707 0.000000 -0.177786\n' +
        'v 0.814812 0.033856 -0.176123\n' +
        'v 0.798524 0.045371 -0.148837\n' +
        'v 0.798524 -0.045371 -0.148837\n' +
        'v 0.814812 -0.033856 -0.176123\n' +
        'v 0.809450 0.068127 -0.160174\n' +
        'v 0.798524 0.094073 -0.157740\n' +
        'v 0.798524 -0.094072 -0.157740\n' +
        'v 0.809450 -0.068127 -0.160174\n' +
        'v 0.814366 0.090722 -0.187960\n' +
        'v 0.805718 0.109863 -0.218642\n' +
        'v 0.805718 -0.109863 -0.218642\n' +
        'v 0.814366 -0.090722 -0.187960\n' +
        'v 0.811432 0.080556 -0.240619\n' +
        'v 0.811432 -0.080556 -0.240619\n' +
        'v 0.820894 0.052775 -0.212738\n' +
        'v 0.820894 -0.052775 -0.212738\n' +
        'v 0.815605 0.000000 -0.241940\n' +
        'v 0.748360 0.000000 -0.067368\n' +
        'v 0.761687 0.103999 -0.128335\n' +
        'v 0.761687 -0.103999 -0.128335\n' +
        'v 0.734972 0.139052 -0.227512\n' +
        'v 0.726314 0.153017 -0.179116\n' +
        'v 0.726314 -0.153017 -0.179116\n' +
        'v 0.734972 -0.139052 -0.227512\n' +
        'v 0.725257 0.136833 -0.313467\n' +
        'v 0.692247 0.173041 -0.275119\n' +
        'v 0.692247 -0.173041 -0.275119\n' +
        'v 0.725257 -0.136833 -0.313467\n' +
        'v 0.691705 0.192057 -0.380208\n' +
        'v 0.691705 -0.192057 -0.380208\n' +
        'v 0.563151 0.260742 -0.369575\n' +
        'v 0.632216 0.219862 -0.321723\n' +
        'v 0.632216 -0.219862 -0.321723\n' +
        'v 0.563151 -0.260742 -0.369575\n' +
        'v 0.563856 0.228841 -0.276937\n' +
        'v 0.640490 0.195204 -0.239610\n' +
        'v 0.640490 -0.195204 -0.239610\n' +
        'v 0.563856 -0.228841 -0.276937\n' +
        'v 0.578912 0.209852 -0.207872\n' +
        'v 0.578912 -0.209852 -0.207872\n' +
        'v 0.724524 0.087736 -0.753012\n' +
        'v 0.726563 0.000000 -0.755263\n' +
        'v 0.713949 0.046197 -0.757514\n' +
        'v 0.713949 -0.046197 -0.757514\n' +
        'v 0.724524 -0.087736 -0.753012\n' +
        'v 0.708008 0.098877 -0.821126\n' +
        'v 0.707791 0.093994 -0.782254\n' +
        'v 0.707791 -0.093994 -0.782254\n' +
        'v 0.708008 -0.098877 -0.821126\n' +
        'v 0.691515 0.055854 -0.869303\n' +
        'v 0.689806 0.072510 -0.842855\n' +
        'v 0.689806 -0.072510 -0.842855\n' +
        'v 0.691515 -0.055854 -0.869303\n' +
        'v 0.686578 0.000000 -0.880968\n' +
        'v 0.679471 0.024712 -0.869982\n' +
        'v 0.679471 -0.024712 -0.869982\n' +
        'v 0.660753 0.000000 -0.863119\n' +
        'v 0.663402 0.047770 -0.852132\n' +
        'v 0.646638 0.026964 -0.842340\n' +
        'v 0.646638 -0.026964 -0.842339\n' +
        'v 0.663402 -0.047770 -0.852132\n' +
        'v 0.677369 0.085907 -0.811881\n' +
        'v 0.651694 0.071639 -0.823545\n' +
        'v 0.651694 -0.071639 -0.823545\n' +
        'v 0.677369 -0.085907 -0.811881\n' +
        'v 0.690421 0.077718 -0.764377\n' +
        'v 0.661853 0.085473 -0.790654\n' +
        'v 0.661853 -0.085473 -0.790654\n' +
        'v 0.690421 -0.077718 -0.764377\n' +
        'v 0.689833 0.000000 -0.768446\n' +
        'v 0.665817 0.041287 -0.779704\n' +
        'v 0.665817 -0.041287 -0.779704\n' +
        'v 0.648275 0.000000 -0.813965\n' +
        'v 0.649333 0.061523 -0.805691\n' +
        'v 0.649333 -0.061523 -0.805691\n' +
        'v 0.768501 0.153836 0.218099\n' +
        'v 0.762451 0.175727 0.150011\n' +
        'v 0.769043 0.178630 0.188178\n' +
        'v 0.769043 -0.178630 0.188178\n' +
        'v 0.762451 -0.175727 0.150011\n' +
        'v 0.768501 -0.153836 0.218099\n' +
        'v 0.773953 0.156169 0.302762\n' +
        'v 0.773329 0.172282 0.258843\n' +
        'v 0.773329 -0.172282 0.258843\n' +
        'v 0.773953 -0.156169 0.302762\n' +
        'v 0.775798 0.192953 0.387967\n' +
        'v 0.775201 0.191352 0.337864\n' +
        'v 0.775201 -0.191352 0.337864\n' +
        'v 0.775798 -0.192952 0.387967\n' +
        'v 0.755534 0.233724 0.096056\n' +
        'v 0.767578 0.208496 0.133057\n' +
        'v 0.767578 -0.208496 0.133057\n' +
        'v 0.755534 -0.233724 0.096056\n' +
        'v 0.723904 0.367025 0.055501\n' +
        'v 0.751329 0.301432 0.085775\n' +
        'v 0.751329 -0.301432 0.085775\n' +
        'v 0.723904 -0.367025 0.055501\n' +
        'v 0.693441 0.487522 0.093180\n' +
        'v 0.720758 0.424832 0.081245\n' +
        'v 0.720757 -0.424832 0.081245\n' +
        'v 0.693441 -0.487522 0.093180\n' +
        'v 0.668918 0.585585 0.190809\n' +
        'v 0.691379 0.526720 0.148248\n' +
        'v 0.691379 -0.526720 0.148248\n' +
        'v 0.668918 -0.585585 0.190809\n' +
        'v 0.669135 0.607531 0.288927\n' +
        'v 0.676704 0.582574 0.242106\n' +
        'v 0.676704 -0.582574 0.242106\n' +
        'v 0.669135 -0.607530 0.288927\n' +
        'v 0.689616 0.562202 0.361599\n' +
        'v 0.684353 0.573676 0.320096\n' +
        'v 0.684353 -0.573676 0.320095\n' +
        'v 0.689616 -0.562202 0.361599\n' +
        'v 0.736898 0.436334 0.416694\n' +
        'v 0.723633 0.491564 0.377550\n' +
        'v 0.723633 -0.491564 0.377550\n' +
        'v 0.736898 -0.436334 0.416694\n' +
        'v 0.753635 0.335585 0.448703\n' +
        'v 0.755968 0.379883 0.417399\n' +
        'v 0.755968 -0.379883 0.417399\n' +
        'v 0.753635 -0.335585 0.448703\n' +
        'v 0.766629 0.260335 0.440375\n' +
        'v 0.761990 0.303223 0.428087\n' +
        'v 0.761990 -0.303223 0.428087\n' +
        'v 0.766629 -0.260335 0.440375\n' +
        'v 0.772434 0.239556 0.400825\n' +
        'v 0.772434 -0.239556 0.400825\n' +
        'v 0.766412 0.277669 0.404785\n' +
        'v 0.768880 0.225396 0.363064\n' +
        'v 0.761393 0.258138 0.377767\n' +
        'v 0.761393 -0.258138 0.377767\n' +
        'v 0.768880 -0.225396 0.363064\n' +
        'v 0.766412 -0.277669 0.404785\n' +
        'v 0.757134 0.339681 0.413276\n' +
        'v 0.757650 0.309245 0.401204\n' +
        'v 0.757650 -0.309245 0.401204\n' +
        'v 0.757134 -0.339681 0.413276\n' +
        'v 0.746718 0.425781 0.390517\n' +
        'v 0.748861 0.376302 0.397135\n' +
        'v 0.748861 -0.376302 0.397135\n' +
        'v 0.746718 -0.425781 0.390517\n' +
        'v 0.697456 0.529487 0.342665\n' +
        'v 0.714681 0.471517 0.362467\n' +
        'v 0.714681 -0.471517 0.362467\n' +
        'v 0.697456 -0.529487 0.342665\n' +
        'v 0.679281 0.565511 0.281304\n' +
        'v 0.677246 0.540365 0.308268\n' +
        'v 0.677246 -0.540365 0.308268\n' +
        'v 0.679281 -0.565511 0.281304\n' +
        'v 0.681342 0.548476 0.201199\n' +
        'v 0.672689 0.548503 0.245280\n' +
        'v 0.672689 -0.548503 0.245280\n' +
        'v 0.681342 -0.548476 0.201199\n' +
        'v 0.707791 0.468804 0.118761\n' +
        'v 0.687988 0.502279 0.164876\n' +
        'v 0.687988 -0.502279 0.164876\n' +
        'v 0.707791 -0.468804 0.118761\n' +
        'v 0.735135 0.367160 0.086833\n' +
        'v 0.714844 0.416992 0.104329\n' +
        'v 0.714844 -0.416992 0.104329\n' +
        'v 0.735135 -0.367160 0.086833\n' +
        'v 0.761149 0.251166 0.117757\n' +
        'v 0.741537 0.309570 0.107096\n' +
        'v 0.741537 -0.309570 0.107096\n' +
        'v 0.761149 -0.251166 0.117757\n' +
        'v 0.762614 0.199680 0.166016\n' +
        'v 0.753255 0.225260 0.148763\n' +
        'v 0.753255 -0.225260 0.148763\n' +
        'v 0.762614 -0.199680 0.166016\n' +
        'v 0.768039 0.192030 0.296414\n' +
        'v 0.757813 0.215820 0.327474\n' +
        'v 0.757813 -0.215820 0.327474\n' +
        'v 0.768039 -0.192030 0.296414\n' +
        'v 0.764567 0.185818 0.225288\n' +
        'v 0.753906 0.196289 0.261882\n' +
        'v 0.753906 -0.196289 0.261882\n' +
        'v 0.764567 -0.185818 0.225288\n' +
        'v 0.750326 0.200033 0.199707\n' +
        'v 0.750326 -0.200033 0.199707\n' +
        'v 0.675673 0.000000 0.438386\n' +
        'v 0.679807 0.090738 0.502255\n' +
        'v 0.623451 0.048995 0.458757\n' +
        'v 0.623451 -0.048994 0.458757\n' +
        'v 0.679807 -0.090738 0.502255\n' +
        'v 0.685140 0.188874 0.657249\n' +
        'v 0.630477 0.185040 0.577115\n' +
        'v 0.630477 -0.185040 0.577115\n' +
        'v 0.685140 -0.188874 0.657249\n' +
        'v 0.664414 0.327697 0.689205\n' +
        'v 0.628294 0.266490 0.654885\n' +
        'v 0.628295 -0.266490 0.654885\n' +
        'v 0.664414 -0.327697 0.689205\n' +
        'v 0.618404 0.490532 0.581079\n' +
        'v 0.602181 0.369838 0.618360\n' +
        'v 0.602181 -0.369838 0.618360\n' +
        'v 0.618404 -0.490532 0.581079\n' +
        'v 0.562012 0.681044 0.477051\n' +
        'v 0.518944 0.574476 0.508257\n' +
        'v 0.518944 -0.574476 0.508257\n' +
        'v 0.562012 -0.681044 0.477051\n' +
        'v 0.511203 0.798503 0.382243\n' +
        'v 0.469618 0.732259 0.431369\n' +
        'v 0.469618 -0.732259 0.431369\n' +
        'v 0.511203 -0.798503 0.382243\n' +
        'v 0.437364 0.774170 0.172282\n' +
        'v 0.399061 0.789632 0.288764\n' +
        'v 0.399061 -0.789632 0.288764\n' +
        'v 0.437364 -0.774170 0.172282\n' +
        'v 0.464627 0.619141 -0.005371\n' +
        'v 0.359158 0.708143 0.082275\n' +
        'v 0.359158 -0.708143 0.082275\n' +
        'v 0.464627 -0.619141 -0.005371\n' +
        'v 0.500414 0.426048 -0.111362\n' +
        'v 0.403472 0.528040 -0.062711\n' +
        'v 0.403472 -0.528040 -0.062711\n' +
        'v 0.500414 -0.426048 -0.111362\n' +
        'v 0.332275 0.067952 -0.573107\n' +
        'v 0.301812 0.000000 -0.514703\n' +
        'v 0.268446 0.085449 -0.460178\n' +
        'v 0.320882 0.142660 -0.480496\n' +
        'v 0.320882 -0.142659 -0.480496\n' +
        'v 0.268446 -0.085449 -0.460178\n' +
        'v 0.332275 -0.067952 -0.573107\n' +
        'v 0.369059 0.071072 -0.771674\n' +
        'v 0.343316 0.000000 -0.676107\n' +
        'v 0.361925 0.134630 -0.649143\n' +
        'v 0.361925 -0.134630 -0.649143\n' +
        'v 0.369059 -0.071072 -0.771674\n' +
        'v 0.452203 0.081299 -0.932265\n' +
        'v 0.404405 0.000000 -0.873101\n' +
        'v 0.402696 0.152859 -0.847439\n' +
        'v 0.402696 -0.152859 -0.847439\n' +
        'v 0.452203 -0.081299 -0.932265\n' +
        'v 0.494385 0.168267 -0.951687\n' +
        'v 0.511014 0.000000 -0.968153\n' +
        'v 0.494385 -0.168267 -0.951687\n' +
        'v 0.469745 0.297704 -0.910123\n' +
        'v 0.433368 0.237021 -0.901212\n' +
        'v 0.433368 -0.237021 -0.901212\n' +
        'v 0.469745 -0.297704 -0.910123\n' +
        'v 0.464030 0.318414 -0.788249\n' +
        'v 0.417661 0.285877 -0.831089\n' +
        'v 0.417661 -0.285877 -0.831089\n' +
        'v 0.464030 -0.318414 -0.788249\n' +
        'v 0.479438 0.296224 -0.598470\n' +
        'v 0.410455 0.262044 -0.644152\n' +
        'v 0.410455 -0.262044 -0.644152\n' +
        'v 0.479438 -0.296224 -0.598470\n' +
        'v 0.384901 0.213976 -0.735270\n' +
        'v 0.370877 0.194417 -0.537028\n' +
        'v 0.370877 -0.194417 -0.537028\n' +
        'v 0.384901 -0.213976 -0.735270\n' +
        'v 0.336941 0.202989 -0.401096\n' +
        'v 0.411838 0.242540 -0.460558\n' +
        'v 0.411838 -0.242540 -0.460558\n' +
        'v 0.336941 -0.202989 -0.401096\n' +
        'v 0.487440 0.268880 -0.413629\n' +
        'v 0.487440 -0.268880 -0.413629\n' +
        'v 0.492069 0.241671 -0.302922\n' +
        'v 0.441998 0.252513 -0.240557\n' +
        'v 0.514251 0.224564 -0.235623\n' +
        'v 0.514251 -0.224564 -0.235623\n' +
        'v 0.441998 -0.252513 -0.240557\n' +
        'v 0.492069 -0.241671 -0.302922\n' +
        'v 0.406656 0.232932 -0.340750\n' +
        'v 0.406656 -0.232932 -0.340750\n' +
        'v 0.527377 0.246408 -0.177480\n' +
        'v 0.493333 0.241118 -0.190473\n' +
        'v 0.493333 -0.241118 -0.190473\n' +
        'v 0.527377 -0.246408 -0.177480\n' +
        'v 0.489019 0.313357 -0.148515\n' +
        'v 0.489019 -0.313356 -0.148515\n' +
        'v -0.694770 -0.000000 -0.051541\n' +
        'v -0.722729 0.174334 0.095486\n' +
        'v -0.614149 0.302626 -0.036296\n' +
        'v -0.576353 0.162941 -0.158746\n' +
        'v -0.576353 -0.162941 -0.158746\n' +
        'v -0.614149 -0.302626 -0.036296\n' +
        'v -0.722729 -0.174335 0.095486\n' +
        'v -0.467828 -0.000000 -0.266059\n' +
        'v -0.409985 0.287996 -0.213840\n' +
        'v -0.275092 0.142144 -0.327013\n' +
        'v -0.275092 -0.142144 -0.327013\n' +
        'v -0.409984 -0.287996 -0.213840\n' +
        'v -0.076009 -0.000000 -0.395182\n' +
        'v -0.052839 0.238980 -0.332279\n' +
        'v 0.114971 0.108573 -0.411733\n' +
        'v 0.114971 -0.108573 -0.411733\n' +
        'v -0.052839 -0.238980 -0.332279\n' +
        'v 0.217339 0.000000 -0.449653\n' +
        'v 0.242788 0.171163 -0.399404\n' +
        'v 0.242788 -0.171163 -0.399404\n' +
        'v 0.283142 0.234653 -0.324261\n' +
        'v 0.283142 -0.234653 -0.324261\n' +
        'v 0.249240 0.781359 0.198242\n' +
        'v 0.244161 0.652072 -0.006337\n' +
        'v 0.099751 0.768825 0.102902\n' +
        'v 0.099752 -0.768825 0.102902\n' +
        'v 0.244161 -0.652072 -0.006337\n' +
        'v 0.249241 -0.781359 0.198242\n' +
        'v -0.778266 -0.000000 0.295519\n' +
        'v -0.715034 0.213596 0.486708\n' +
        'v -0.681957 0.357169 0.250543\n' +
        'v -0.681957 -0.357169 0.250543\n' +
        'v -0.715034 -0.213596 0.486708\n' +
        'v 0.094238 -0.000000 0.916016\n' +
        'v 0.240777 0.221598 0.830051\n' +
        'v 0.058187 0.408936 0.863770\n' +
        'v -0.085422 0.221029 0.926297\n' +
        'v -0.085422 -0.221029 0.926297\n' +
        'v 0.058187 -0.408936 0.863770\n' +
        'v 0.240777 -0.221598 0.830051\n' +
        'v -0.283095 -0.000000 0.917698\n' +
        'v -0.256131 0.408881 0.865099\n' +
        'v -0.449897 0.221544 0.826715\n' +
        'v -0.449897 -0.221544 0.826715\n' +
        'v -0.256131 -0.408881 0.865099\n' +
        'v -0.637858 -0.000000 0.696560\n' +
        'v -0.556858 0.407308 0.633952\n' +
        'v -0.556858 -0.407308 0.633952\n' +
        'v 0.404460 0.644233 0.465468\n' +
        'v 0.364366 0.754801 0.383274\n' +
        'v 0.298231 0.694119 0.461317\n' +
        'v 0.298231 -0.694119 0.461317\n' +
        'v 0.364366 -0.754801 0.383274\n' +
        'v 0.404460 -0.644233 0.465468\n' +
        'v 0.204156 0.628581 0.581950\n' +
        'v 0.181098 0.757243 0.466200\n' +
        'v 0.085069 0.709771 0.605387\n' +
        'v 0.085069 -0.709771 0.605387\n' +
        'v 0.181098 -0.757243 0.466200\n' +
        'v 0.204156 -0.628581 0.581950\n' +
        'v -0.033393 0.635091 0.724501\n' +
        'v -0.030925 0.776801 0.563477\n' +
        'v -0.155735 0.715305 0.660617\n' +
        'v -0.155735 -0.715305 0.660617\n' +
        'v -0.030924 -0.776801 0.563477\n' +
        'v -0.033393 -0.635091 0.724501\n' +
        'v -0.288981 0.635037 0.714220\n' +
        'v -0.260986 0.768467 0.551491\n' +
        'v -0.377374 0.709331 0.571782\n' +
        'v -0.377374 -0.709331 0.571782\n' +
        'v -0.260986 -0.768467 0.551491\n' +
        'v -0.288981 -0.635037 0.714220\n' +
        'v -0.377108 0.760505 0.426538\n' +
        'v -0.487514 0.676744 0.304273\n' +
        'v -0.494548 0.623562 0.506673\n' +
        'v -0.494548 -0.623562 0.506673\n' +
        'v -0.487514 -0.676744 0.304273\n' +
        'v -0.377108 -0.760505 0.426538\n' +
        'v -0.600044 0.512994 0.391059\n' +
        'v -0.406440 0.539361 0.717828\n' +
        'v -0.406440 -0.539361 0.717828\n' +
        'v -0.600043 -0.512994 0.391059\n' +
        'v -0.132324 0.540690 0.816569\n' +
        'v -0.132324 -0.540690 0.816569\n' +
        'v 0.136122 0.540446 0.738010\n' +
        'v 0.136122 -0.540446 0.738010\n' +
        'v 0.317193 0.411675 0.678684\n' +
        'v 0.351535 0.545709 0.538249\n' +
        'v 0.351535 -0.545709 0.538249\n' +
        'v 0.317193 -0.411675 0.678684\n' +
        'v 0.489118 0.433566 0.530826\n' +
        'v 0.489118 -0.433566 0.530826\n' +
        'v 0.395399 0.000000 0.716542\n' +
        'v 0.473158 0.235130 0.589742\n' +
        'v 0.473158 -0.235130 0.589742\n' +
        'v 0.575229 0.282537 0.539374\n' +
        'v 0.575229 -0.282537 0.539374\n' +
        'v 0.575030 0.108633 0.512475\n' +
        'v 0.575030 -0.108633 0.512475\n' +
        'v 0.590088 0.000000 0.486417\n' +
        'v 0.205756 0.789985 0.330349\n' +
        'v 0.205756 -0.789985 0.330349\n' +
        'v 0.041852 0.817860 0.261058\n' +
        'v 0.028153 0.813818 0.423303\n' +
        'v 0.028153 -0.813818 0.423303\n' +
        'v 0.041852 -0.817860 0.261058\n' +
        'v -0.119958 0.828772 0.349030\n' +
        'v -0.169039 0.805806 0.457859\n' +
        'v -0.169039 -0.805806 0.457859\n' +
        'v -0.119958 -0.828772 0.349030\n' +
        'v -0.305045 0.806308 0.352328\n' +
        'v -0.305044 -0.806308 0.352328\n' +
        'v 0.129492 0.307366 -0.276005\n' +
        'v -0.224094 0.360541 -0.226644\n' +
        'v -0.034945 0.430293 -0.190620\n' +
        'v -0.034945 -0.430293 -0.190620\n' +
        'v -0.224094 -0.360541 -0.226644\n' +
        'v 0.129492 -0.307366 -0.276005\n' +
        'v -0.054912 0.637655 -0.084141\n' +
        'v 0.115755 0.550699 -0.107208\n' +
        'v -0.188287 0.530138 -0.126753\n' +
        'v -0.188287 -0.530138 -0.126753\n' +
        'v 0.115755 -0.550699 -0.107208\n' +
        'v -0.054912 -0.637655 -0.084141\n' +
        'v 0.316964 0.424266 -0.138150\n' +
        'v 0.316964 -0.424266 -0.138150\n' +
        'v 0.445935 0.312364 -0.171068\n' +
        'v 0.298853 0.306987 -0.234928\n' +
        'v 0.298853 -0.306987 -0.234928\n' +
        'v 0.445935 -0.312364 -0.171068\n' +
        'v -0.432962 0.701375 0.139193\n' +
        'v -0.443816 0.574620 0.025146\n' +
        'v -0.556103 0.549279 0.181247\n' +
        'v -0.556103 -0.549279 0.181247\n' +
        'v -0.443816 -0.574620 0.025146\n' +
        'v -0.432962 -0.701375 0.139193\n' +
        'v -0.600803 0.417832 0.069567\n' +
        'v -0.600803 -0.417832 0.069567\n' +
        'v -0.294881 0.622559 -0.072351\n' +
        'v -0.365700 0.461334 -0.100016\n' +
        'v -0.365700 -0.461334 -0.100016\n' +
        'v -0.294881 -0.622559 -0.072351\n' +
        'v -0.510376 0.394028 -0.075033\n' +
        'v -0.510376 -0.394028 -0.075033\n' +
        'v -0.310710 1.032634 0.437256\n' +
        'v -0.298693 0.959147 0.425971\n' +
        'v -0.240560 0.912679 0.379015\n' +
        'v -0.270644 0.971517 0.384440\n' +
        'v -0.270643 -0.971517 0.384440\n' +
        'v -0.240560 -0.912679 0.379015\n' +
        'v -0.298692 -0.959147 0.425971\n' +
        'v -0.310710 -1.032634 0.437256\n' +
        'v -0.385579 1.125217 0.469537\n' +
        'v -0.352919 1.105143 0.420247\n' +
        'v -0.393609 1.195285 0.437880\n' +
        'v -0.393609 -1.195285 0.437880\n' +
        'v -0.352919 -1.105143 0.420247\n' +
        'v -0.385579 -1.125217 0.469537\n' +
        'v -0.433024 1.278836 0.394504\n' +
        'v -0.407471 1.228923 0.357096\n' +
        'v -0.416124 1.281711 0.291748\n' +
        'v -0.416124 -1.281711 0.291748\n' +
        'v -0.407471 -1.228923 0.357096\n' +
        'v -0.433024 -1.278836 0.394504\n' +
        'v -0.435710 1.300049 0.185547\n' +
        'v -0.413737 1.241184 0.182888\n' +
        'v -0.403537 1.221436 0.083523\n' +
        'v -0.403537 -1.221436 0.083523\n' +
        'v -0.413737 -1.241184 0.182888\n' +
        'v -0.435710 -1.300049 0.185547\n' +
        'v -0.392931 1.152344 -0.010498\n' +
        'v -0.364177 1.123183 0.020671\n' +
        'v -0.306695 1.031630 -0.052355\n' +
        'v -0.306695 -1.031630 -0.052355\n' +
        'v -0.364176 -1.123183 0.020671\n' +
        'v -0.392931 -1.152344 -0.010498\n' +
        'v -0.258789 0.913005 -0.103570\n' +
        'v -0.234701 0.932455 -0.055366\n' +
        'v -0.172635 0.817247 -0.092909\n' +
        'v -0.172635 -0.817247 -0.092909\n' +
        'v -0.234700 -0.932454 -0.055366\n' +
        'v -0.258789 -0.913005 -0.103570\n' +
        'v -0.325033 1.032905 -0.007704\n' +
        'v -0.289307 0.958035 -0.015951\n' +
        'v -0.208740 0.869303 -0.039198\n' +
        'v -0.208740 -0.869303 -0.039198\n' +
        'v -0.289307 -0.958035 -0.015951\n' +
        'v -0.325033 -1.032905 -0.007704\n' +
        'v -0.412164 1.182075 0.098389\n' +
        'v -0.402317 1.114746 0.044623\n' +
        'v -0.402317 -1.114746 0.044623\n' +
        'v -0.412164 -1.182075 0.098389\n' +
        'v -0.425185 1.231879 0.260824\n' +
        'v -0.444119 1.214762 0.172906\n' +
        'v -0.444119 -1.214762 0.172906\n' +
        'v -0.425184 -1.231879 0.260824\n' +
        'v -0.402615 1.166043 0.374702\n' +
        'v -0.440348 1.206109 0.308702\n' +
        'v -0.440348 -1.206109 0.308702\n' +
        'v -0.402615 -1.166043 0.374702\n' +
        'v -0.329075 1.032362 0.375298\n' +
        'v -0.395861 1.100586 0.358073\n' +
        'v -0.395860 -1.100586 0.358073\n' +
        'v -0.329074 -1.032362 0.375298\n' +
        'v -0.264431 0.936524 0.329481\n' +
        'v -0.322862 0.985650 0.331082\n' +
        'v -0.322862 -0.985650 0.331082\n' +
        'v -0.264431 -0.936524 0.329481\n' +
        'v -0.022830 0.733787 0.016047\n' +
        'v -0.140469 0.689592 -0.070129\n' +
        'v -0.118053 0.718188 -0.012106\n' +
        'v -0.118053 -0.718188 -0.012106\n' +
        'v -0.140469 -0.689592 -0.070129\n' +
        'v -0.022830 -0.733787 0.016047\n' +
        'v -0.185872 0.706517 -0.107399\n' +
        'v -0.167971 0.775267 -0.054265\n' +
        'v -0.167971 -0.775267 -0.054265\n' +
        'v -0.185872 -0.706517 -0.107399\n' +
        'v -0.062690 0.786348 0.147524\n' +
        'v -0.062690 -0.786348 0.147524\n' +
        'v -0.247761 0.856045 0.357476\n' +
        'v -0.200343 0.843119 0.314860\n' +
        'v -0.226888 0.885444 0.322591\n' +
        'v -0.226888 -0.885444 0.322591\n' +
        'v -0.200343 -0.843119 0.314860\n' +
        'v -0.247761 -0.856045 0.357476\n' +
        'v -0.239041 0.839301 -0.022190\n' +
        'v -0.214796 0.781104 -0.017350\n' +
        'v -0.214796 -0.781104 -0.017350\n' +
        'v -0.239041 -0.839301 -0.022190\n' +
        'v -0.264730 0.811876 0.002414\n' +
        'v -0.235542 0.780430 0.031715\n' +
        'v -0.181629 0.738369 0.007248\n' +
        'v -0.181629 -0.738369 0.007248\n' +
        'v -0.235542 -0.780430 0.031715\n' +
        'v -0.264730 -0.811876 0.002414\n' +
        'v -0.274723 0.790377 0.079754\n' +
        'v -0.238019 0.766075 0.082378\n' +
        'v -0.274587 0.816527 0.051298\n' +
        'v -0.274587 -0.816527 0.051298\n' +
        'v -0.238019 -0.766076 0.082378\n' +
        'v -0.274723 -0.790377 0.079754\n' +
        'v -0.269070 0.794271 0.132107\n' +
        'v -0.237874 0.812799 0.181939\n' +
        'v -0.189643 0.771546 0.129289\n' +
        'v -0.189643 -0.771546 0.129289\n' +
        'v -0.237874 -0.812798 0.181939\n' +
        'v -0.269070 -0.794271 0.132107\n' +
        'v -0.242025 0.869629 0.264621\n' +
        'v -0.206435 0.830431 0.250407\n' +
        'v -0.268582 0.856391 0.212267\n' +
        'v -0.268582 -0.856391 0.212267\n' +
        'v -0.206434 -0.830431 0.250407\n' +
        'v -0.242025 -0.869629 0.264621\n' +
        'v -0.277615 0.913384 0.279324\n' +
        'v -0.277615 -0.913384 0.279324\n' +
        'v -0.138324 0.812340 0.232860\n' +
        'v -0.138324 -0.812340 0.232860\n' +
        'v -0.134472 0.740802 0.053018\n' +
        'v -0.134472 -0.740803 0.053018\n' +
        'v -0.323269 0.953885 0.293620\n' +
        'v -0.296875 0.892415 0.236654\n' +
        'v -0.329346 0.932916 0.253391\n' +
        'v -0.329346 -0.932916 0.253391\n' +
        'v -0.296875 -0.892415 0.236654\n' +
        'v -0.323269 -0.953885 0.293620\n' +
        'v -0.295085 0.835558 0.169189\n' +
        'v -0.315565 0.875977 0.193088\n' +
        'v -0.315565 -0.875977 0.193088\n' +
        'v -0.295085 -0.835558 0.169189\n' +
        'v -0.295009 0.786380 0.104518\n' +
        'v -0.312547 0.815189 0.128240\n' +
        'v -0.312547 -0.815189 0.128240\n' +
        'v -0.295009 -0.786380 0.104518\n' +
        'v -0.296981 0.818263 0.072932\n' +
        'v -0.312520 0.809519 0.095322\n' +
        'v -0.312520 -0.809519 0.095322\n' +
        'v -0.296981 -0.818263 0.072932\n' +
        'v -0.295383 0.837267 0.022569\n' +
        'v -0.314182 0.848823 0.053684\n' +
        'v -0.314182 -0.848823 0.053684\n' +
        'v -0.295383 -0.837267 0.022569\n' +
        'v -0.284293 0.829805 -0.010515\n' +
        'v -0.307812 0.845268 0.005531\n' +
        'v -0.307812 -0.845268 0.005531\n' +
        'v -0.284293 -0.829805 -0.010515\n' +
        'v -0.273221 0.897407 -0.014811\n' +
        'v -0.292010 0.859794 -0.006147\n' +
        'v -0.292010 -0.859794 -0.006147\n' +
        'v -0.273220 -0.897407 -0.014811\n' +
        'v -0.385580 1.042761 0.332420\n' +
        'v -0.371338 1.004648 0.301306\n' +
        'v -0.371338 -1.004648 0.301306\n' +
        'v -0.385579 -1.042761 0.332420\n' +
        'v -0.447239 1.164614 0.331715\n' +
        'v -0.432292 1.106825 0.327908\n' +
        'v -0.432292 -1.106825 0.327908\n' +
        'v -0.447238 -1.164614 0.331715\n' +
        'v -0.463867 1.224826 0.238064\n' +
        'v -0.462945 1.195050 0.283538\n' +
        'v -0.462945 -1.195050 0.283538\n' +
        'v -0.463867 -1.224826 0.238064\n' +
        'v -0.450928 1.178548 0.102431\n' +
        'v -0.462864 1.200819 0.171495\n' +
        'v -0.462863 -1.200819 0.171495\n' +
        'v -0.450928 -1.178548 0.102431\n' +
        'v -0.378065 1.041097 0.013319\n' +
        'v -0.429606 1.107341 0.064779\n' +
        'v -0.429606 -1.107341 0.064779\n' +
        'v -0.378065 -1.041097 0.013319\n' +
        'v -0.338053 0.966309 0.010064\n' +
        'v -0.338053 -0.966309 0.010064\n' +
        'v -0.323676 0.857313 0.092556\n' +
        'v -0.321696 0.882406 0.040229\n' +
        'v -0.333632 0.910916 0.089355\n' +
        'v -0.333632 -0.910916 0.089355\n' +
        'v -0.321696 -0.882406 0.040229\n' +
        'v -0.323676 -0.857314 0.092556\n' +
        'v -0.338840 0.922906 0.143636\n' +
        'v -0.348769 0.960802 0.085259\n' +
        'v -0.358371 0.978163 0.147352\n' +
        'v -0.358371 -0.978163 0.147352\n' +
        'v -0.348768 -0.960802 0.085259\n' +
        'v -0.338840 -0.922906 0.143636\n' +
        'v -0.360080 0.983833 0.204536\n' +
        'v -0.385200 1.037245 0.145047\n' +
        'v -0.379096 1.038032 0.205160\n' +
        'v -0.379096 -1.038032 0.205160\n' +
        'v -0.385200 -1.037245 0.145047\n' +
        'v -0.360080 -0.983833 0.204536\n' +
        'v -0.384060 1.047861 0.253671\n' +
        'v -0.403783 1.101570 0.202231\n' +
        'v -0.406292 1.107968 0.246240\n' +
        'v -0.406292 -1.107967 0.246240\n' +
        'v -0.403783 -1.101570 0.202231\n' +
        'v -0.384060 -1.047861 0.253671\n' +
        'v -0.404378 1.065511 0.298584\n' +
        'v -0.361654 0.988227 0.257731\n' +
        'v -0.361654 -0.988227 0.257731\n' +
        'v -0.404378 -1.065511 0.298584\n' +
        'v -0.337050 0.926568 0.201660\n' +
        'v -0.337050 -0.926568 0.201660\n' +
        'v -0.324680 0.865967 0.140923\n' +
        'v -0.324680 -0.865967 0.140923\n' +
        'v -0.318387 0.915120 0.026964\n' +
        'v -0.318386 -0.915121 0.026964\n' +
        'v -0.384060 1.021756 0.069336\n' +
        'v -0.384060 -1.021756 0.069336\n' +
        'v -0.427328 1.121853 0.140489\n' +
        'v -0.427327 -1.121853 0.140489\n' +
        'v -0.439428 1.167190 0.226116\n' +
        'v -0.439427 -1.167190 0.226116\n' +
        'v -0.433729 1.130507 0.296902\n' +
        'v -0.433729 -1.130507 0.296902\n' +
        'v -0.391032 1.038710 -0.063856\n' +
        'v -0.269694 0.799425 -0.103868\n' +
        'v -0.386312 0.919759 -0.018256\n' +
        'v -0.386312 -0.919759 -0.018256\n' +
        'v -0.269694 -0.799425 -0.103868\n' +
        'v -0.391032 -1.038710 -0.063856\n' +
        'v -0.465314 1.261900 0.080187\n' +
        'v -0.486364 1.162914 0.063938\n' +
        'v -0.486364 -1.162914 0.063938\n' +
        'v -0.465314 -1.261900 0.080187\n' +
        'v -0.467527 1.325935 0.295174\n' +
        'v -0.502927 1.316929 0.212057\n' +
        'v -0.502927 -1.316929 0.212057\n' +
        'v -0.467527 -1.325935 0.295174\n' +
        'v -0.465477 1.225007 0.444173\n' +
        'v -0.505654 1.299432 0.344639\n' +
        'v -0.505653 -1.299432 0.344639\n' +
        'v -0.465477 -1.225007 0.444173\n' +
        'v -0.397163 1.035183 0.440077\n' +
        'v -0.487314 1.140345 0.378092\n' +
        'v -0.487314 -1.140345 0.378092\n' +
        'v -0.397163 -1.035184 0.440077\n' +
        'v -0.324490 0.885824 0.377848\n' +
        'v -0.405382 0.942329 0.328966\n' +
        'v -0.405382 -0.942329 0.328966\n' +
        'v -0.324490 -0.885824 0.377848\n' +
        'v -0.467936 1.038303 0.182780\n' +
        'v -0.382840 0.839410 0.136719\n' +
        'v -0.382840 -0.839410 0.136719\n' +
        'v -0.467936 -1.038303 0.182780\n' +
        'v -0.520861 1.249566 0.252577\n' +
        'v -0.520860 -1.249566 0.252577\n' +
        'v -0.377447 0.807793 0.272250\n' +
        'v -0.377447 -0.807793 0.272250\n' +
        'v -0.350694 0.728244 -0.011095\n' +
        'v -0.350694 -0.728244 -0.011095\n' +
        'v 0.719489 0.490041 0.186537\n' +
        'v 0.719489 -0.490041 0.186537\n' +
        'v 0.625482 0.553073 0.160645\n' +
        'v 0.625482 -0.553074 0.160645\n' +
        'v 0.649906 0.435225 0.044820\n' +
        'v 0.649906 -0.435225 0.044820\n' +
        'v 0.736657 0.409326 0.107615\n' +
        'v 0.736657 -0.409325 0.107615\n' +
        'v 0.757728 0.295831 0.107615\n' +
        'v 0.757728 -0.295831 0.107615\n' +
        'v 0.680183 0.267985 0.044820\n' +
        'v 0.680183 -0.267985 0.044820\n' +
        'v 0.695879 0.150211 0.160645\n' +
        'v 0.695879 -0.150211 0.160645\n' +
        'v 0.767734 0.216831 0.186537\n' +
        'v 0.767734 -0.216831 0.186537\n' +
        'v 0.767734 0.216831 0.299957\n' +
        'v 0.767734 -0.216831 0.299957\n' +
        'v 0.695879 0.150211 0.325935\n' +
        'v 0.695879 -0.150211 0.325935\n' +
        'v 0.680183 0.267985 0.443698\n' +
        'v 0.680183 -0.267985 0.443699\n' +
        'v 0.757728 0.295831 0.380744\n' +
        'v 0.757728 -0.295831 0.380744\n' +
        'v 0.736657 0.409326 0.380744\n' +
        'v 0.736657 -0.409325 0.380744\n' +
        'v 0.649906 0.435225 0.443698\n' +
        'v 0.649906 -0.435225 0.443699\n' +
        'v 0.625482 0.553073 0.325935\n' +
        'v 0.625481 -0.553073 0.325935\n' +
        'v 0.719489 0.490041 0.299957\n' +
        'v 0.719489 -0.490041 0.299957\n' +
        'v 0.769157 0.454486 0.286075\n' +
        'v 0.769157 -0.454486 0.286075\n' +
        'v 0.782428 0.395371 0.346926\n' +
        'v 0.782428 -0.395371 0.346926\n' +
        'v 0.799389 0.311598 0.346926\n' +
        'v 0.799389 -0.311598 0.346926\n' +
        'v 0.807248 0.254199 0.286075\n' +
        'v 0.807248 -0.254199 0.286075\n' +
        'v 0.807248 0.254199 0.202223\n' +
        'v 0.807248 -0.254199 0.202223\n' +
        'v 0.799389 0.311598 0.144824\n' +
        'v 0.799389 -0.311598 0.144824\n' +
        'v 0.782428 0.395371 0.144824\n' +
        'v 0.782428 -0.395371 0.144824\n' +
        'v 0.769157 0.454486 0.202223\n' +
        'v 0.769157 -0.454486 0.202223\n' +
        'v 0.793859 0.422494 0.214486\n' +
        'v 0.793859 -0.422494 0.214486\n' +
        'v 0.803802 0.381936 0.174040\n' +
        'v 0.803802 -0.381936 0.174040\n' +
        'v 0.816225 0.323853 0.174040\n' +
        'v 0.816225 -0.323853 0.174040\n' +
        'v 0.821614 0.283407 0.214486\n' +
        'v 0.821615 -0.283407 0.214486\n' +
        'v 0.821615 0.283407 0.272710\n' +
        'v 0.821615 -0.283407 0.272710\n' +
        'v 0.816225 0.323853 0.315489\n' +
        'v 0.816225 -0.323853 0.315489\n' +
        'v 0.803802 0.381936 0.315489\n' +
        'v 0.803803 -0.381936 0.315489\n' +
        'v 0.793859 0.422494 0.272710\n' +
        'v 0.793859 -0.422494 0.272710\n' +
        'v 0.599620 0.083466 -0.954895\n' +
        'v 0.599620 -0.083466 -0.954895\n' +
        'v 0.585592 0.221273 -0.936290\n' +
        'v 0.585592 -0.221273 -0.936290\n' +
        'v 0.587538 0.292562 -0.885708\n' +
        'v 0.587538 -0.292562 -0.885708\n' +
        'v 0.610938 0.302226 -0.768521\n' +
        'v 0.610938 -0.302226 -0.768521\n' +
        'v 0.631304 0.276076 -0.567773\n' +
        'v 0.631304 -0.276076 -0.567773\n' +
        'v 0.642072 0.295484 -0.115736\n' +
        'v 0.642072 -0.295484 -0.115736\n' +
        'v 0.591207 0.517541 -0.038876\n' +
        'v 0.591207 -0.517541 -0.038876\n' +
        'v 0.554169 0.694146 0.094872\n' +
        'v 0.554169 -0.694146 0.094872\n' +
        'v 0.574741 0.780457 0.285516\n' +
        'v 0.574741 -0.780457 0.285516\n' +
        'v 0.646203 0.741747 0.421882\n' +
        'v 0.646203 -0.741747 0.421882\n' +
        'v 0.704603 0.579671 0.510939\n' +
        'v 0.704603 -0.579671 0.510939\n' +
        'v 0.758063 0.392802 0.629445\n' +
        'v 0.758064 -0.392802 0.629446\n' +
        'v 0.789002 0.250315 0.672221\n' +
        'v 0.789001 -0.250315 0.672221\n' +
        'v 0.795417 0.134016 0.561011\n' +
        'v 0.795417 -0.134016 0.561011\n' +
        'v 0.785332 0.043345 0.429640\n' +
        'v 0.785332 -0.043345 0.429640\n' +
        'v 0.804287 0.180050 0.481635\n' +
        'v 0.804287 -0.180050 0.481635\n' +
        'v 0.794607 0.273790 0.548140\n' +
        'v 0.794607 -0.273790 0.548140\n' +
        'v 0.770993 0.380002 0.523933\n' +
        'v 0.770993 -0.380001 0.523933\n' +
        'v 0.725023 0.538025 0.444197\n' +
        'v 0.725023 -0.538025 0.444197\n' +
        'v 0.673547 0.663761 0.365262\n' +
        'v 0.673547 -0.663761 0.365261\n' +
        'v 0.638526 0.681257 0.263994\n' +
        'v 0.638526 -0.681257 0.263994\n' +
        'v 0.636410 0.612651 0.127323\n' +
        'v 0.636410 -0.612651 0.127323\n' +
        'v 0.667803 0.469045 0.023512\n' +
        'v 0.667803 -0.469045 0.023512\n' +
        'v 0.728331 0.278078 -0.008243\n' +
        'v 0.728331 -0.278078 -0.008243\n' +
        'v 0.756531 0.126433 0.044161\n' +
        'v 0.756531 -0.126433 0.044161\n' +
        'v 0.798777 0.099575 0.376184\n' +
        'v 0.798777 -0.099575 0.376184\n' +
        'v 0.777106 0.064185 0.269098\n' +
        'v 0.777106 -0.064185 0.269098\n' +
        'v 0.751911 0.073018 0.153129\n' +
        'v 0.751911 -0.073018 0.153129\n' +
        'v 0.662659 0.055613 -0.911699\n' +
        'v 0.662659 -0.055613 -0.911699\n' +
        'v 0.666501 0.143155 -0.889113\n' +
        'v 0.666501 -0.143155 -0.889113\n' +
        'v 0.683162 0.181429 -0.822323\n' +
        'v 0.683162 -0.181429 -0.822323\n' +
        'v 0.717679 0.163971 -0.568682\n' +
        'v 0.717678 -0.163971 -0.568682\n' +
        'v 0.702409 0.184159 -0.730225\n' +
        'v 0.702409 -0.184159 -0.730225\n' +
        'v 0.745845 0.042190 -0.381135\n' +
        'v 0.745845 -0.042190 -0.381135\n' +
        'v 0.741123 0.049554 -0.563076\n' +
        'v 0.741123 -0.049554 -0.563076\n' +
        'v 0.733286 0.056704 -0.709154\n' +
        'v 0.733286 -0.056704 -0.709154\n' +
        'v 0.767214 0.107932 -0.253500\n' +
        'v 0.767214 -0.107932 -0.253500\n' +
        'v 0.768273 0.114855 -0.184421\n' +
        'v 0.768273 -0.114855 -0.184421\n' +
        'v 0.763376 0.062276 -0.138042\n' +
        'v 0.763376 -0.062276 -0.138042\n' +
        'v 0.768974 0.010488 -0.160480\n' +
        'v 0.768974 -0.010488 -0.160480\n' +
        'v 0.762474 0.043889 -0.302908\n' +
        'v 0.762474 -0.043889 -0.302908\n' +
        'v 0.792963 0.041939 -0.280865\n' +
        'v 0.792963 -0.041939 -0.280865\n' +
        'v 0.803512 0.022556 -0.165962\n' +
        'v 0.803512 -0.022556 -0.165962\n' +
        'v 0.796838 0.071031 -0.144960\n' +
        'v 0.796838 -0.071031 -0.144960\n' +
        'v 0.803347 0.107679 -0.186123\n' +
        'v 0.803347 -0.107679 -0.186123\n' +
        'v 0.801515 0.099407 -0.243606\n' +
        'v 0.801515 -0.099407 -0.243606\n' +
        'v 0.818119 0.061994 -0.183869\n' +
        'v 0.818119 -0.061994 -0.183869\n' +
        'v 0.815105 0.045519 -0.241289\n' +
        'v 0.815105 -0.045519 -0.241289\n' +
        'v 0.755838 0.057840 -0.086147\n' +
        'v 0.755838 -0.057840 -0.086147\n' +
        'v 0.750233 0.128620 -0.179667\n' +
        'v 0.750233 -0.128620 -0.179667\n' +
        'v 0.727148 0.139633 -0.268207\n' +
        'v 0.727148 -0.139633 -0.268207\n' +
        'v 0.725219 0.139840 -0.376985\n' +
        'v 0.725219 -0.139840 -0.376985\n' +
        'v 0.634213 0.237081 -0.379429\n' +
        'v 0.634213 -0.237081 -0.379428\n' +
        'v 0.632599 0.207096 -0.278907\n' +
        'v 0.632599 -0.207096 -0.278907\n' +
        'v 0.657297 0.185647 -0.194688\n' +
        'v 0.657297 -0.185647 -0.194688\n' +
        'v 0.726772 0.049291 -0.750197\n' +
        'v 0.726772 -0.049291 -0.750197\n' +
        'v 0.717433 0.103148 -0.782484\n' +
        'v 0.717433 -0.103148 -0.782484\n' +
        'v 0.698744 0.081109 -0.850769\n' +
        'v 0.698744 -0.081109 -0.850769\n' +
        'v 0.687642 0.028283 -0.878513\n' +
        'v 0.687642 -0.028283 -0.878513\n' +
        'v 0.661125 0.024038 -0.860708\n' +
        'v 0.661125 -0.024038 -0.860708\n' +
        'v 0.669020 0.069963 -0.835803\n' +
        'v 0.669020 -0.069962 -0.835803\n' +
        'v 0.685093 0.090552 -0.783635\n' +
        'v 0.685093 -0.090552 -0.783635\n' +
        'v 0.690842 0.044627 -0.764052\n' +
        'v 0.690842 -0.044627 -0.764052\n' +
        'v 0.648895 0.034058 -0.810489\n' +
        'v 0.648895 -0.034058 -0.810489\n' +
        'v 0.649704 0.075754 -0.805564\n' +
        'v 0.649704 -0.075754 -0.805564\n' +
        'v 0.765038 0.162228 0.181695\n' +
        'v 0.765038 -0.162228 0.181695\n' +
        'v 0.771481 0.151299 0.258894\n' +
        'v 0.771481 -0.151299 0.258894\n' +
        'v 0.775872 0.169922 0.347449\n' +
        'v 0.775872 -0.169922 0.347449\n' +
        'v 0.761037 0.196018 0.122494\n' +
        'v 0.761037 -0.196018 0.122494\n' +
        'v 0.741570 0.295980 0.069970\n' +
        'v 0.741570 -0.295980 0.069970\n' +
        'v 0.708052 0.430122 0.063751\n' +
        'v 0.708052 -0.430122 0.063751\n' +
        'v 0.679145 0.542769 0.138343\n' +
        'v 0.679145 -0.542769 0.138343\n' +
        'v 0.666280 0.605804 0.242401\n' +
        'v 0.666280 -0.605804 0.242401\n' +
        'v 0.675520 0.595435 0.328142\n' +
        'v 0.675520 -0.595435 0.328142\n' +
        'v 0.713776 0.503174 0.391232\n' +
        'v 0.713776 -0.503174 0.391232\n' +
        'v 0.748450 0.380547 0.436727\n' +
        'v 0.748450 -0.380547 0.436727\n' +
        'v 0.759735 0.296719 0.450124\n' +
        'v 0.759735 -0.296719 0.450124\n' +
        'v 0.772454 0.224508 0.419461\n' +
        'v 0.772454 -0.224508 0.419461\n' +
        'v 0.768633 0.250078 0.387851\n' +
        'v 0.768633 -0.250078 0.387851\n' +
        'v 0.761366 0.306966 0.413171\n' +
        'v 0.761366 -0.306966 0.413171\n' +
        'v 0.755548 0.378337 0.405589\n' +
        'v 0.755547 -0.378337 0.405589\n' +
        'v 0.723002 0.481286 0.368808\n' +
        'v 0.723002 -0.481286 0.368808\n' +
        'v 0.683994 0.556064 0.313897\n' +
        'v 0.683994 -0.556064 0.313897\n' +
        'v 0.677646 0.564358 0.243479\n' +
        'v 0.677646 -0.564358 0.243479\n' +
        'v 0.692868 0.514001 0.157060\n' +
        'v 0.692868 -0.514001 0.157060\n' +
        'v 0.721442 0.420902 0.094181\n' +
        'v 0.721442 -0.420902 0.094181\n' +
        'v 0.750085 0.305746 0.097168\n' +
        'v 0.750085 -0.305745 0.097168\n' +
        'v 0.763835 0.217367 0.140940\n' +
        'v 0.763835 -0.217367 0.140940\n' +
        'v 0.768714 0.205499 0.331702\n' +
        'v 0.768714 -0.205499 0.331702\n' +
        'v 0.766527 0.185964 0.260098\n' +
        'v 0.766527 -0.185964 0.260098\n' +
        'v 0.762858 0.190094 0.193932\n' +
        'v 0.762858 -0.190094 0.193932\n' +
        'v 0.677093 0.043606 0.453352\n' +
        'v 0.677093 -0.043606 0.453352\n' +
        'v 0.684231 0.137575 0.582376\n' +
        'v 0.684231 -0.137575 0.582376\n' +
        'v 0.677066 0.254262 0.694391\n' +
        'v 0.677066 -0.254262 0.694391\n' +
        'v 0.644554 0.404027 0.644248\n' +
        'v 0.644554 -0.404027 0.644248\n' +
        'v 0.588971 0.588823 0.523528\n' +
        'v 0.588971 -0.588823 0.523528\n' +
        'v 0.540036 0.754218 0.438955\n' +
        'v 0.540036 -0.754218 0.438955\n' +
        'v 0.468363 0.805776 0.285197\n' +
        'v 0.468363 -0.805776 0.285197\n' +
        'v 0.441972 0.706635 0.073476\n' +
        'v 0.441973 -0.706635 0.073476\n' +
        'v 0.483498 0.526385 -0.065442\n' +
        'v 0.483498 -0.526385 -0.065442\n' +
        'v 0.305132 0.075328 -0.504039\n' +
        'v 0.305132 -0.075328 -0.504039\n' +
        'v 0.349264 0.067244 -0.667792\n' +
        'v 0.349264 -0.067244 -0.667792\n' +
        'v 0.404232 0.076236 -0.865092\n' +
        'v 0.404233 -0.076236 -0.865092\n' +
        'v 0.506168 0.085181 -0.963125\n' +
        'v 0.506168 -0.085181 -0.963125\n' +
        'v 0.480406 0.244267 -0.936729\n' +
        'v 0.480406 -0.244266 -0.936729\n' +
        'v 0.463197 0.319113 -0.860920\n' +
        'v 0.463197 -0.319113 -0.860920\n' +
        'v 0.471083 0.308946 -0.697937\n' +
        'v 0.471083 -0.308946 -0.697937\n' +
        'v 0.377797 0.201257 -0.632792\n' +
        'v 0.377797 -0.201257 -0.632792\n' +
        'v 0.401816 0.227200 -0.830694\n' +
        'v 0.401816 -0.227200 -0.830694\n' +
        'v 0.356177 0.196649 -0.458635\n' +
        'v 0.356177 -0.196648 -0.458635\n' +
        'v 0.484751 0.282979 -0.499498\n' +
        'v 0.484751 -0.282979 -0.499498\n' +
        'v 0.502304 0.233118 -0.266116\n' +
        'v 0.502304 -0.233118 -0.266116\n' +
        'v 0.488991 0.253903 -0.350128\n' +
        'v 0.488991 -0.253903 -0.350127\n' +
        'v 0.524375 0.219944 -0.206557\n' +
        'v 0.524375 -0.219944 -0.206557\n' +
        'v 0.517925 0.322432 -0.147040\n' +
        'v 0.517925 -0.322432 -0.147040\n' +
        'v -0.666301 0.165880 -0.047906\n' +
        'v -0.666301 -0.165880 -0.047906\n' +
        'v -0.447129 0.155384 -0.252370\n' +
        'v -0.447129 -0.155384 -0.252370\n' +
        'v -0.068659 0.125203 -0.378636\n' +
        'v -0.068659 -0.125203 -0.378636\n' +
        'v 0.217911 0.095147 -0.434554\n' +
        'v 0.217911 -0.095147 -0.434554\n' +
        'v 0.315757 0.210631 -0.362224\n' +
        'v 0.315757 -0.210631 -0.362224\n' +
        'v 0.232339 0.735134 0.090335\n' +
        'v 0.232339 -0.735134 0.090335\n' +
        'v -0.746737 0.194060 0.281515\n' +
        'v -0.746737 -0.194060 0.281514\n' +
        'v 0.086985 0.221100 0.903198\n' +
        'v 0.086985 -0.221100 0.903198\n' +
        'v -0.269185 0.221093 0.905528\n' +
        'v -0.269185 -0.221093 0.905528\n' +
        'v -0.608568 0.221324 0.679193\n' +
        'v -0.608568 -0.221324 0.679192\n' +
        'v 0.389194 0.707960 0.431959\n' +
        'v 0.389194 -0.707960 0.431959\n' +
        'v 0.196350 0.698558 0.530250\n' +
        'v 0.196350 -0.698558 0.530250\n' +
        'v -0.033369 0.714939 0.650316\n' +
        'v -0.033369 -0.714939 0.650316\n' +
        'v -0.275835 0.713998 0.637622\n' +
        'v -0.275835 -0.713998 0.637622\n' +
        'v -0.447765 0.701191 0.452734\n' +
        'v -0.447765 -0.701191 0.452734\n' +
        'v -0.523393 0.534071 0.571838\n' +
        'v -0.523393 -0.534071 0.571838\n' +
        'v -0.272485 0.540524 0.795315\n' +
        'v -0.272485 -0.540524 0.795315\n' +
        'v 0.006395 0.540660 0.799425\n' +
        'v 0.006395 -0.540660 0.799425\n' +
        'v 0.250960 0.540738 0.633409\n' +
        'v 0.250960 -0.540738 0.633409\n' +
        'v 0.440154 0.558380 0.501942\n' +
        'v 0.440154 -0.558380 0.501942\n' +
        'v 0.371260 0.223789 0.707947\n' +
        'v 0.371260 -0.223789 0.707947\n' +
        'v 0.600035 0.279077 0.594031\n' +
        'v 0.600035 -0.279076 0.594031\n' +
        'v 0.535880 0.264055 0.533733\n' +
        'v 0.535880 -0.264055 0.533733\n' +
        'v 0.594812 0.043831 0.482234\n' +
        'v 0.594812 -0.043831 0.482234\n' +
        'v 0.305827 0.783878 0.301693\n' +
        'v 0.305827 -0.783878 0.301693\n' +
        'v 0.115901 0.803067 0.376510\n' +
        'v 0.115901 -0.803067 0.376510\n' +
        'v -0.065614 0.813537 0.453482\n' +
        'v -0.065614 -0.813537 0.453482\n' +
        'v -0.278844 0.792182 0.441368\n' +
        'v -0.278844 -0.792182 0.441368\n' +
        'v -0.042816 0.335332 -0.263090\n' +
        'v -0.042816 -0.335332 -0.263090\n' +
        'v -0.039594 0.539466 -0.131719\n' +
        'v -0.039594 -0.539466 -0.131719\n' +
        'v 0.273223 0.542417 -0.078372\n' +
        'v 0.273223 -0.542417 -0.078372\n' +
        'v 0.377783 0.320816 -0.194374\n' +
        'v 0.377783 -0.320816 -0.194374\n' +
        'v 0.242705 0.280628 -0.279938\n' +
        'v 0.242705 -0.280628 -0.279938\n' +
        'v 0.477754 0.286245 -0.166731\n' +
        'v 0.477755 -0.286245 -0.166731\n' +
        'v -0.492076 0.627542 0.156363\n' +
        'v -0.492076 -0.627542 0.156363\n' +
        'v -0.618937 0.468543 0.215902\n' +
        'v -0.618937 -0.468543 0.215902\n' +
        'v -0.331983 0.541211 -0.073111\n' +
        'v -0.331983 -0.541211 -0.073111\n' +
        'v -0.385386 0.383582 -0.156565\n' +
        'v -0.385386 -0.383582 -0.156565\n' +
        'v -0.579610 0.380666 -0.019135\n' +
        'v -0.579610 -0.380666 -0.019135\n' +
        'v -0.270264 0.965332 0.411116\n' +
        'v -0.270264 -0.965332 0.411116\n' +
        'v -0.356411 1.114977 0.451860\n' +
        'v -0.356411 -1.114977 0.451860\n' +
        'v -0.411092 1.254327 0.381304\n' +
        'v -0.411092 -1.254327 0.381304\n' +
        'v -0.416484 1.270840 0.185703\n' +
        'v -0.416484 -1.270840 0.185703\n' +
        'v -0.367038 1.137224 0.002981\n' +
        'v -0.367038 -1.137224 0.002981\n' +
        'v -0.230876 0.920197 -0.083160\n' +
        'v -0.230876 -0.920197 -0.083160\n' +
        'v -0.258128 0.946455 -0.031742\n' +
        'v -0.258128 -0.946455 -0.031742\n' +
        'v -0.378893 1.115618 0.035506\n' +
        'v -0.378893 -1.115618 0.035506\n' +
        'v -0.424981 1.221788 0.178141\n' +
        'v -0.424981 -1.221788 0.178141\n' +
        'v -0.419515 1.212216 0.330539\n' +
        'v -0.419515 -1.212216 0.330539\n' +
        'v -0.369537 1.100179 0.386047\n' +
        'v -0.369537 -1.100179 0.386047\n' +
        'v -0.292145 0.978533 0.355309\n' +
        'v -0.292145 -0.978533 0.355309\n' +
        'v -0.083945 0.693917 -0.044363\n' +
        'v -0.083945 -0.693917 -0.044363\n' +
        'v -0.155783 0.736002 -0.086328\n' +
        'v -0.155783 -0.736002 -0.086328\n' +
        'v 0.006842 0.786423 0.128939\n' +
        'v 0.006842 -0.786423 0.128939\n' +
        'v -0.221652 0.871194 0.344740\n' +
        'v -0.221652 -0.871194 0.344740\n' +
        'v -0.201427 0.812723 -0.033223\n' +
        'v -0.201427 -0.812724 -0.033223\n' +
        'v -0.225624 0.775182 0.004718\n' +
        'v -0.225624 -0.775182 0.004718\n' +
        'v -0.253464 0.786391 0.059641\n' +
        'v -0.253464 -0.786391 0.059641\n' +
        'v -0.235181 0.780888 0.128708\n' +
        'v -0.235181 -0.780888 0.128708\n' +
        'v -0.239614 0.842017 0.226902\n' +
        'v -0.239614 -0.842017 0.226902\n' +
        'v -0.248793 0.900696 0.298872\n' +
        'v -0.248793 -0.900696 0.298872\n' +
        'v -0.167210 0.829524 0.285890\n' +
        'v -0.167210 -0.829525 0.285890\n' +
        'v -0.129828 0.776391 0.140687\n' +
        'v -0.129827 -0.776391 0.140687\n' +
        'v -0.144003 0.726315 0.010103\n' +
        'v -0.144003 -0.726315 0.010103\n' +
        'v -0.305545 0.921217 0.266846\n' +
        'v -0.305545 -0.921217 0.266846\n' +
        'v -0.294576 0.865167 0.204173\n' +
        'v -0.294576 -0.865167 0.204173\n' +
        'v -0.295256 0.803637 0.133104\n' +
        'v -0.295256 -0.803637 0.133104\n' +
        'v -0.296048 0.796292 0.087965\n' +
        'v -0.296048 -0.796292 0.087965\n' +
        'v -0.296281 0.833621 0.049341\n' +
        'v -0.296281 -0.833621 0.049341\n' +
        'v -0.293275 0.830491 0.002020\n' +
        'v -0.293275 -0.830491 0.002020\n' +
        'v -0.269400 0.851281 -0.015924\n' +
        'v -0.269400 -0.851281 -0.015924\n' +
        'v -0.351240 0.992867 0.315682\n' +
        'v -0.351240 -0.992867 0.315682\n' +
        'v -0.420414 1.104784 0.341302\n' +
        'v -0.420414 -1.104784 0.341302\n' +
        'v -0.460324 1.206761 0.295466\n' +
        'v -0.460324 -1.206761 0.295466\n' +
        'v -0.462250 1.215461 0.169271\n' +
        'v -0.462250 -1.215461 0.169271\n' +
        'v -0.423876 1.116811 0.049503\n' +
        'v -0.423876 -1.116811 0.049503\n' +
        'v -0.317739 0.964054 -0.006595\n' +
        'v -0.317739 -0.964054 -0.006595\n' +
        'v -0.324995 0.876095 0.067440\n' +
        'v -0.324995 -0.876095 0.067440\n' +
        'v -0.345351 0.945608 0.116869\n' +
        'v -0.345350 -0.945608 0.116869\n' +
        'v -0.369771 1.008433 0.177975\n' +
        'v -0.369771 -1.008433 0.177975\n' +
        'v -0.388269 1.069495 0.226727\n' +
        'v -0.388269 -1.069495 0.226727\n' +
        'v -0.380605 1.024601 0.279867\n' +
        'v -0.380605 -1.024601 0.279867\n' +
        'v -0.347409 0.956207 0.231191\n' +
        'v -0.347409 -0.956207 0.231191\n' +
        'v -0.329664 0.897040 0.171058\n' +
        'v -0.329664 -0.897041 0.171058\n' +
        'v -0.320677 0.834039 0.113681\n' +
        'v -0.320677 -0.834039 0.113681\n' +
        'v -0.310290 0.872938 0.013695\n' +
        'v -0.310290 -0.872938 0.013695\n' +
        'v -0.347510 0.966475 0.044935\n' +
        'v -0.347510 -0.966475 0.044935\n' +
        'v -0.411055 1.075691 0.101729\n' +
        'v -0.411055 -1.075691 0.101729\n' +
        'v -0.435866 1.154072 0.183041\n' +
        'v -0.435866 -1.154072 0.183041\n' +
        'v -0.437955 1.156218 0.265839\n' +
        'v -0.437955 -1.156218 0.265839\n' +
        'v -0.426885 1.102712 0.311813\n' +
        'v -0.426885 -1.102712 0.311813\n' +
        'v -0.321604 0.913177 -0.096832\n' +
        'v -0.321604 -0.913178 -0.096832\n' +
        'v -0.440723 1.162332 -0.004612\n' +
        'v -0.440722 -1.162332 -0.004612\n' +
        'v -0.469587 1.317280 0.186125\n' +
        'v -0.469587 -1.317280 0.186125\n' +
        'v -0.470767 1.293320 0.387019\n' +
        'v -0.470767 -1.293320 0.387019\n' +
        'v -0.438396 1.132316 0.456662\n' +
        'v -0.438396 -1.132316 0.456662\n' +
        'v -0.354672 0.951796 0.412666\n' +
        'v -0.354672 -0.951796 0.412666\n' +
        'v -0.417382 0.930637 0.154439\n' +
        'v -0.417382 -0.930637 0.154439\n' +
        'v -0.504459 1.152805 0.218970\n' +
        'v -0.504459 -1.152805 0.218970\n' +
        'v -0.518747 1.300265 0.271792\n' +
        'v -0.518747 -1.300265 0.271792\n' +
        'v -0.314129 0.837139 0.343399\n' +
        'v -0.314129 -0.837139 0.343399\n' +
        'v -0.391162 0.767063 0.131054\n' +
        'v -0.391162 -0.767063 0.131054\n' +
        'v -0.267168 0.705187 -0.089275\n' +
        'v -0.267168 -0.705187 -0.089275\n' +
        'vn 0.6471 0.7531 -0.1188\n' +
        'vn 0.6582 0.6661 -0.3508\n' +
        'vn 0.6363 0.6807 -0.3631\n' +
        'vn 0.6270 0.7689 -0.1257\n' +
        'vn 0.6363 -0.6807 -0.3631\n' +
        'vn 0.6582 -0.6661 -0.3508\n' +
        'vn 0.6471 -0.7531 -0.1188\n' +
        'vn 0.6270 -0.7689 -0.1257\n' +
        'vn 0.5305 0.8351 -0.1454\n' +
        'vn 0.5312 0.7366 -0.4185\n' +
        'vn 0.4611 0.7634 -0.4523\n' +
        'vn 0.4667 0.8704 -0.1566\n' +
        'vn 0.4611 -0.7634 -0.4523\n' +
        'vn 0.5312 -0.7366 -0.4185\n' +
        'vn 0.5305 -0.8351 -0.1454\n' +
        'vn 0.4667 -0.8704 -0.1566\n' +
        'vn 0.5346 0.5369 -0.6526\n' +
        'vn 0.5436 0.2633 -0.7970\n' +
        'vn 0.4441 0.2531 -0.8595\n' +
        'vn 0.4503 0.5470 -0.7057\n' +
        'vn 0.4441 -0.2531 -0.8595\n' +
        'vn 0.5436 -0.2633 -0.7970\n' +
        'vn 0.5346 -0.5369 -0.6526\n' +
        'vn 0.4503 -0.5470 -0.7057\n' +
        'vn 0.6845 0.4875 -0.5421\n' +
        'vn 0.7139 0.2655 -0.6480\n' +
        'vn 0.6862 0.2672 -0.6766\n' +
        'vn 0.6584 0.5019 -0.5609\n' +
        'vn 0.6862 -0.2672 -0.6766\n' +
        'vn 0.7139 -0.2655 -0.6480\n' +
        'vn 0.6845 -0.4875 -0.5421\n' +
        'vn 0.6584 -0.5019 -0.5609\n' +
        'vn 0.7393 0.0006 -0.6734\n' +
        'vn 0.7591 -0.2741 -0.5904\n' +
        'vn 0.7350 -0.2960 -0.6101\n' +
        'vn 0.7126 -0.0159 -0.7014\n' +
        'vn 0.7350 0.2960 -0.6101\n' +
        'vn 0.7591 0.2741 -0.5904\n' +
        'vn 0.7393 -0.0006 -0.6734\n' +
        'vn 0.7126 0.0159 -0.7014\n' +
        'vn 0.5622 -0.0681 -0.8242\n' +
        'vn 0.5900 -0.3812 -0.7118\n' +
        'vn 0.4874 -0.4215 -0.7647\n' +
        'vn 0.4561 -0.0960 -0.8847\n' +
        'vn 0.4874 0.4215 -0.7647\n' +
        'vn 0.5900 0.3812 -0.7118\n' +
        'vn 0.5622 0.0681 -0.8242\n' +
        'vn 0.4561 0.0960 -0.8847\n' +
        'vn 0.6202 -0.6304 -0.4669\n' +
        'vn 0.6380 -0.7529 -0.1614\n' +
        'vn 0.5463 -0.8188 -0.1766\n' +
        'vn 0.5244 -0.6844 -0.5065\n' +
        'vn 0.5463 0.8188 -0.1766\n' +
        'vn 0.6380 0.7529 -0.1614\n' +
        'vn 0.6202 0.6304 -0.4669\n' +
        'vn 0.5244 0.6844 -0.5065\n' +
        'vn 0.7729 -0.5054 -0.3837\n' +
        'vn 0.7778 -0.6152 -0.1285\n' +
        'vn 0.7644 -0.6307 -0.1342\n' +
        'vn 0.7542 -0.5235 -0.3964\n' +
        'vn 0.7644 0.6307 -0.1342\n' +
        'vn 0.7778 0.6152 -0.1285\n' +
        'vn 0.7729 0.5054 -0.3837\n' +
        'vn 0.7542 0.5235 -0.3964\n' +
        'vn 0.7756 -0.6184 0.1266\n' +
        'vn 0.7625 -0.5234 0.3803\n' +
        'vn 0.7492 -0.5323 0.3942\n' +
        'vn 0.7633 -0.6322 0.1331\n' +
        'vn 0.7492 0.5323 0.3942\n' +
        'vn 0.7625 0.5234 0.3803\n' +
        'vn 0.7756 0.6184 0.1266\n' +
        'vn 0.7633 0.6322 0.1331\n' +
        'vn 0.6397 -0.7518 0.1598\n' +
        'vn 0.6280 -0.6286 0.4587\n' +
        'vn 0.5439 -0.6796 0.4923\n' +
        'vn 0.5506 -0.8165 0.1740\n' +
        'vn 0.5439 0.6796 0.4923\n' +
        'vn 0.6280 0.6286 0.4587\n' +
        'vn 0.6397 0.7518 0.1598\n' +
        'vn 0.5506 0.8165 0.1740\n' +
        'vn 0.6059 -0.3769 0.7006\n' +
        'vn 0.5820 -0.0627 0.8108\n' +
        'vn 0.5042 -0.0840 0.8595\n' +
        'vn 0.5261 -0.4112 0.7444\n' +
        'vn 0.5042 0.0840 0.8595\n' +
        'vn 0.5820 0.0627 0.8108\n' +
        'vn 0.6059 0.3769 0.7006\n' +
        'vn 0.5261 0.4112 0.7444\n' +
        'vn 0.7367 -0.2992 0.6064\n' +
        'vn 0.7100 -0.0123 0.7040\n' +
        'vn 0.6986 -0.0219 0.7152\n' +
        'vn 0.7242 -0.3078 0.6170\n' +
        'vn 0.6986 0.0219 0.7152\n' +
        'vn 0.7100 0.0123 0.7040\n' +
        'vn 0.7367 0.2991 0.6064\n' +
        'vn 0.7242 0.3078 0.6170\n' +
        'vn 0.6852 0.2672 0.6776\n' +
        'vn 0.6618 0.5020 0.5568\n' +
        'vn 0.6477 0.5088 0.5671\n' +
        'vn 0.6725 0.2679 0.6899\n' +
        'vn 0.6477 -0.5088 0.5671\n' +
        'vn 0.6618 -0.5020 0.5568\n' +
        'vn 0.6852 -0.2672 0.6776\n' +
        'vn 0.6725 -0.2679 0.6899\n' +
        'vn 0.5623 0.2649 0.7834\n' +
        'vn 0.5482 0.5371 0.6411\n' +
        'vn 0.4835 0.5471 0.6833\n' +
        'vn 0.4897 0.2577 0.8329\n' +
        'vn 0.4835 -0.5471 0.6833\n' +
        'vn 0.5482 -0.5371 0.6411\n' +
        'vn 0.5623 -0.2649 0.7834\n' +
        'vn 0.4897 -0.2577 0.8329\n' +
        'vn 0.5375 0.7365 0.4107\n' +
        'vn 0.5319 0.8345 0.1440\n' +
        'vn 0.4702 0.8690 0.1542\n' +
        'vn 0.4766 0.7622 0.4381\n' +
        'vn 0.4702 -0.8690 0.1542\n' +
        'vn 0.5319 -0.8345 0.1440\n' +
        'vn 0.5375 -0.7365 0.4107\n' +
        'vn 0.4766 -0.7622 0.4381\n' +
        'vn 0.6470 0.6787 0.3475\n' +
        'vn 0.6448 0.7553 0.1171\n' +
        'vn 0.6258 0.7699 0.1247\n' +
        'vn 0.6310 0.6867 0.3609\n' +
        'vn 0.6258 -0.7699 0.1247\n' +
        'vn 0.6448 -0.7553 0.1171\n' +
        'vn 0.6470 -0.6787 0.3475\n' +
        'vn 0.6310 -0.6867 0.3609\n' +
        'vn 0.5185 0.8446 0.1331\n' +
        'vn 0.5060 0.7593 0.4093\n' +
        'vn 0.6757 0.6637 0.3209\n' +
        'vn 0.6744 0.7323 0.0945\n' +
        'vn 0.6757 -0.6637 0.3209\n' +
        'vn 0.5060 -0.7593 0.4093\n' +
        'vn 0.5185 -0.8446 0.1331\n' +
        'vn 0.6744 -0.7323 0.0945\n' +
        'vn 0.4924 0.5509 0.6738\n' +
        'vn 0.4840 0.2616 0.8351\n' +
        'vn 0.6680 0.2735 0.6921\n' +
        'vn 0.6711 0.5196 0.5288\n' +
        'vn 0.6680 -0.2735 0.6921\n' +
        'vn 0.4840 -0.2616 0.8351\n' +
        'vn 0.4924 -0.5509 0.6738\n' +
        'vn 0.6711 -0.5196 0.5288\n' +
        'vn 0.4933 -0.0803 0.8661\n' +
        'vn 0.5240 -0.4279 0.7364\n' +
        'vn 0.7128 -0.3337 0.6168\n' +
        'vn 0.6820 -0.0066 0.7313\n' +
        'vn 0.7128 0.3337 0.6168\n' +
        'vn 0.5240 0.4279 0.7364\n' +
        'vn 0.4933 0.0803 0.8661\n' +
        'vn 0.6820 0.0066 0.7313\n' +
        'vn 0.5482 -0.6922 0.4694\n' +
        'vn 0.5521 -0.8180 0.1613\n' +
        'vn 0.7086 -0.6933 0.1312\n' +
        'vn 0.7207 -0.5596 0.4092\n' +
        'vn 0.7086 0.6933 0.1312\n' +
        'vn 0.5521 0.8180 0.1613\n' +
        'vn 0.5482 0.6922 0.4694\n' +
        'vn 0.7207 0.5596 0.4092\n' +
        'vn 0.5552 -0.8151 -0.1656\n' +
        'vn 0.5619 -0.6706 -0.4843\n' +
        'vn 0.7106 -0.5547 -0.4329\n' +
        'vn 0.7068 -0.6942 -0.1358\n' +
        'vn 0.7106 0.5547 -0.4329\n' +
        'vn 0.5619 0.6706 -0.4843\n' +
        'vn 0.5552 0.8151 -0.1656\n' +
        'vn 0.7068 0.6942 -0.1358\n' +
        'vn 0.5522 -0.3993 -0.7319\n' +
        'vn 0.5303 -0.0662 -0.8452\n' +
        'vn 0.6573 -0.0134 -0.7535\n' +
        'vn 0.6928 -0.3323 -0.6400\n' +
        'vn 0.6573 0.0134 -0.7535\n' +
        'vn 0.5303 0.0662 -0.8452\n' +
        'vn 0.5522 0.3993 -0.7319\n' +
        'vn 0.6928 0.3323 -0.6400\n' +
        'vn 0.5197 0.2620 -0.8132\n' +
        'vn 0.5191 0.5341 -0.6673\n' +
        'vn 0.6563 0.5145 -0.5519\n' +
        'vn 0.6452 0.2706 -0.7145\n' +
        'vn 0.6563 -0.5145 -0.5519\n' +
        'vn 0.5191 -0.5341 -0.6673\n' +
        'vn 0.5197 -0.2620 -0.8132\n' +
        'vn 0.6452 -0.2706 -0.7145\n' +
        'vn 0.5184 0.7438 -0.4218\n' +
        'vn 0.5209 0.8426 -0.1366\n' +
        'vn 0.6733 0.7328 -0.0979\n' +
        'vn 0.6696 0.6598 -0.3411\n' +
        'vn 0.6733 -0.7328 -0.0979\n' +
        'vn 0.5210 -0.8426 -0.1366\n' +
        'vn 0.5184 -0.7438 -0.4218\n' +
        'vn 0.6696 -0.6598 -0.3411\n' +
        'vn 0.9480 0.3167 -0.0325\n' +
        'vn 0.8905 0.4268 -0.1578\n' +
        'vn 0.8818 0.4708 -0.0292\n' +
        'vn 0.8818 -0.4708 -0.0292\n' +
        'vn 0.8905 -0.4268 -0.1578\n' +
        'vn 0.9480 -0.3167 -0.0325\n' +
        'vn 0.9222 0.2458 -0.2986\n' +
        'vn 0.8977 0.3815 -0.2205\n' +
        'vn 0.9610 0.2617 -0.0893\n' +
        'vn 0.9610 -0.2617 -0.0893\n' +
        'vn 0.8977 -0.3815 -0.2205\n' +
        'vn 0.9222 -0.2458 -0.2986\n' +
        'vn 0.9861 0.1411 -0.0877\n' +
        'vn 0.9699 -0.0379 -0.2407\n' +
        'vn 0.9398 0.1467 -0.3087\n' +
        'vn 0.9398 -0.1467 -0.3087\n' +
        'vn 0.9699 0.0379 -0.2407\n' +
        'vn 0.9861 -0.1411 -0.0877\n' +
        'vn 0.9984 0.0543 -0.0153\n' +
        'vn 0.9838 -0.1779 -0.0228\n' +
        'vn 0.9792 -0.1124 -0.1687\n' +
        'vn 0.9792 0.1125 -0.1687\n' +
        'vn 0.9838 0.1779 -0.0228\n' +
        'vn 0.9984 -0.0543 -0.0153\n' +
        'vn 0.9984 0.0542 0.0147\n' +
        'vn 0.9812 -0.1115 0.1576\n' +
        'vn 0.9839 -0.1775 0.0220\n' +
        'vn 0.9839 0.1775 0.0220\n' +
        'vn 0.9812 0.1115 0.1576\n' +
        'vn 0.9984 -0.0542 0.0147\n' +
        'vn 0.9864 0.1412 0.0840\n' +
        'vn 0.9451 0.1500 0.2902\n' +
        'vn 0.9735 -0.0345 0.2261\n' +
        'vn 0.9735 0.0345 0.2261\n' +
        'vn 0.9451 -0.1500 0.2902\n' +
        'vn 0.9864 -0.1412 0.0840\n' +
        'vn 0.9613 0.2617 0.0855\n' +
        'vn 0.9014 0.3801 0.2073\n' +
        'vn 0.9279 0.2451 0.2808\n' +
        'vn 0.9279 -0.2451 0.2808\n' +
        'vn 0.9014 -0.3801 0.2073\n' +
        'vn 0.9613 -0.2617 0.0855\n' +
        'vn 0.9479 0.3169 0.0312\n' +
        'vn 0.8820 0.4704 0.0283\n' +
        'vn 0.8923 0.4266 0.1474\n' +
        'vn 0.8923 -0.4266 0.1474\n' +
        'vn 0.8820 -0.4704 0.0283\n' +
        'vn 0.9479 -0.3169 0.0312\n' +
        'vn 0.2602 0.1320 -0.9565\n' +
        'vn 0.5200 0.1300 -0.8442\n' +
        'vn 0.5224 0.0511 -0.8511\n' +
        'vn 0.2787 0.0537 -0.9589\n' +
        'vn 0.5225 -0.0511 -0.8511\n' +
        'vn 0.5200 -0.1300 -0.8442\n' +
        'vn 0.2602 -0.1320 -0.9565\n' +
        'vn 0.2787 -0.0537 -0.9589\n' +
        'vn 0.2954 0.3834 -0.8751\n' +
        'vn 0.6213 0.3511 -0.7005\n' +
        'vn 0.5371 0.2034 -0.8186\n' +
        'vn 0.2494 0.1981 -0.9479\n' +
        'vn 0.5371 -0.2034 -0.8186\n' +
        'vn 0.6213 -0.3511 -0.7005\n' +
        'vn 0.2954 -0.3834 -0.8751\n' +
        'vn 0.2494 -0.1981 -0.9479\n' +
        'vn 0.3876 0.8937 -0.2258\n' +
        'vn 0.7321 0.6151 -0.2927\n' +
        'vn 0.7091 0.5085 -0.4885\n' +
        'vn 0.3881 0.7083 -0.5897\n' +
        'vn 0.7091 -0.5085 -0.4885\n' +
        'vn 0.7321 -0.6151 -0.2927\n' +
        'vn 0.3876 -0.8937 -0.2258\n' +
        'vn 0.3881 -0.7083 -0.5897\n' +
        'vn 0.3462 0.9361 0.0620\n' +
        'vn 0.7053 0.7088 -0.0144\n' +
        'vn 0.7171 0.6850 -0.1287\n' +
        'vn 0.3528 0.9353 -0.0282\n' +
        'vn 0.7171 -0.6850 -0.1287\n' +
        'vn 0.7053 -0.7088 -0.0144\n' +
        'vn 0.3462 -0.9361 0.0620\n' +
        'vn 0.3528 -0.9353 -0.0282\n' +
        'vn 0.3577 0.9204 0.1581\n' +
        'vn 0.6798 0.7273 0.0943\n' +
        'vn 0.6996 0.7130 0.0472\n' +
        'vn 0.3538 0.9289 0.1094\n' +
        'vn 0.6996 -0.7130 0.0472\n' +
        'vn 0.6798 -0.7273 0.0943\n' +
        'vn 0.3577 -0.9204 0.1581\n' +
        'vn 0.3538 -0.9289 0.1094\n' +
        'vn 0.3914 0.4024 -0.8276\n' +
        'vn 0.4218 0.3441 -0.8389\n' +
        'vn 0.6274 0.3711 -0.6846\n' +
        'vn 0.6323 0.4058 -0.6599\n' +
        'vn 0.6274 -0.3711 -0.6846\n' +
        'vn 0.4218 -0.3441 -0.8389\n' +
        'vn 0.3914 -0.4024 -0.8276\n' +
        'vn 0.6323 -0.4058 -0.6599\n' +
        'vn 0.4451 0.4050 -0.7987\n' +
        'vn 0.4354 0.5286 -0.7287\n' +
        'vn 0.6617 0.4783 -0.5774\n' +
        'vn 0.6456 0.3981 -0.6517\n' +
        'vn 0.6617 -0.4783 -0.5774\n' +
        'vn 0.4354 -0.5286 -0.7287\n' +
        'vn 0.4451 -0.4050 -0.7987\n' +
        'vn 0.6456 -0.3981 -0.6517\n' +
        'vn 0.4106 0.6697 -0.6188\n' +
        'vn 0.4159 0.7694 -0.4848\n' +
        'vn 0.6532 0.6531 -0.3831\n' +
        'vn 0.6556 0.5911 -0.4698\n' +
        'vn 0.6532 -0.6531 -0.3831\n' +
        'vn 0.4159 -0.7694 -0.4848\n' +
        'vn 0.4106 -0.6697 -0.6188\n' +
        'vn 0.6556 -0.5911 -0.4698\n' +
        'vn 0.4444 0.8239 -0.3516\n' +
        'vn 0.4734 0.8637 -0.1731\n' +
        'vn 0.7246 0.6244 -0.2917\n' +
        'vn 0.6794 0.6511 -0.3382\n' +
        'vn 0.7246 -0.6244 -0.2917\n' +
        'vn 0.4734 -0.8637 -0.1731\n' +
        'vn 0.4444 -0.8239 -0.3516\n' +
        'vn 0.6794 -0.6511 -0.3382\n' +
        'vn 0.4956 0.8164 0.2963\n' +
        'vn 0.4334 0.5544 0.7105\n' +
        'vn 0.8302 0.5167 0.2094\n' +
        'vn 0.7870 0.6044 -0.1236\n' +
        'vn 0.8302 -0.5167 0.2094\n' +
        'vn 0.4334 -0.5544 0.7105\n' +
        'vn 0.4956 -0.8164 0.2963\n' +
        'vn 0.7870 -0.6044 -0.1236\n' +
        'vn 0.3774 0.5177 0.7678\n' +
        'vn 0.3716 0.5557 0.7437\n' +
        'vn 0.7971 0.4592 0.3923\n' +
        'vn 0.8031 0.4647 0.3728\n' +
        'vn 0.7971 -0.4592 0.3922\n' +
        'vn 0.3716 -0.5557 0.7437\n' +
        'vn 0.3774 -0.5177 0.7678\n' +
        'vn 0.8031 -0.4647 0.3728\n' +
        'vn 0.3972 0.5982 0.6960\n' +
        'vn 0.4330 0.5117 0.7420\n' +
        'vn 0.8425 0.3970 0.3641\n' +
        'vn 0.8087 0.4639 0.3616\n' +
        'vn 0.8425 -0.3970 0.3641\n' +
        'vn 0.4330 -0.5117 0.7420\n' +
        'vn 0.3972 -0.5982 0.6960\n' +
        'vn 0.8087 -0.4639 0.3616\n' +
        'vn 0.4891 0.1393 0.8610\n' +
        'vn 0.4811 -0.4107 0.7745\n' +
        'vn 0.9304 -0.1073 0.3504\n' +
        'vn 0.9049 0.1860 0.3829\n' +
        'vn 0.9304 0.1073 0.3504\n' +
        'vn 0.4811 0.4107 0.7745\n' +
        'vn 0.4891 -0.1393 0.8610\n' +
        'vn 0.9049 -0.1860 0.3829\n' +
        'vn 0.3925 -0.7477 0.5356\n' +
        'vn 0.3306 -0.8247 0.4589\n' +
        'vn 0.8377 -0.4799 0.2607\n' +
        'vn 0.8901 -0.3586 0.2812\n' +
        'vn 0.8377 0.4799 0.2607\n' +
        'vn 0.3306 0.8247 0.4589\n' +
        'vn 0.3925 0.7477 0.5356\n' +
        'vn 0.8901 0.3586 0.2812\n' +
        'vn 0.3311 -0.7481 0.5751\n' +
        'vn 0.4072 -0.3868 0.8274\n' +
        'vn 0.8809 -0.2934 0.3715\n' +
        'vn 0.8230 -0.4775 0.3076\n' +
        'vn 0.8809 0.2934 0.3715\n' +
        'vn 0.4072 0.3868 0.8274\n' +
        'vn 0.3311 0.7481 0.5751\n' +
        'vn 0.8230 0.4775 0.3076\n' +
        'vn 0.8717 0.3818 -0.3072\n' +
        'vn 0.8777 0.3576 -0.3190\n' +
        'vn 0.9568 0.2324 -0.1745\n' +
        'vn 0.9630 0.2012 -0.1795\n' +
        'vn 0.9568 -0.2324 -0.1745\n' +
        'vn 0.8777 -0.3576 -0.3190\n' +
        'vn 0.8717 -0.3818 -0.3072\n' +
        'vn 0.9630 -0.2012 -0.1795\n' +
        'vn 0.8984 0.2734 -0.3438\n' +
        'vn 0.9153 0.1616 -0.3689\n' +
        'vn 0.9633 0.1767 -0.2018\n' +
        'vn 0.9589 0.2123 -0.1882\n' +
        'vn 0.9633 -0.1767 -0.2018\n' +
        'vn 0.9153 -0.1616 -0.3689\n' +
        'vn 0.8984 -0.2734 -0.3438\n' +
        'vn 0.9589 -0.2123 -0.1882\n' +
        'vn 0.9228 0.0689 -0.3791\n' +
        'vn 0.9636 0.1455 -0.2241\n' +
        'vn 0.9660 0.1499 -0.2108\n' +
        'vn 0.9238 0.0742 -0.3756\n' +
        'vn 0.9660 -0.1499 -0.2108\n' +
        'vn 0.9636 -0.1455 -0.2241\n' +
        'vn 0.9228 -0.0689 -0.3791\n' +
        'vn 0.9238 -0.0742 -0.3756\n' +
        'vn 0.8784 0.0614 -0.4739\n' +
        'vn 0.9399 0.1654 -0.2986\n' +
        'vn 0.9551 0.1489 -0.2561\n' +
        'vn 0.9021 0.0802 -0.4239\n' +
        'vn 0.9551 -0.1489 -0.2561\n' +
        'vn 0.9399 -0.1654 -0.2986\n' +
        'vn 0.8784 -0.0614 -0.4739\n' +
        'vn 0.9021 -0.0802 -0.4239\n' +
        'vn 0.9473 0.1559 -0.2798\n' +
        'vn 0.8871 0.3201 -0.3325\n' +
        'vn 0.9135 0.2316 -0.3345\n' +
        'vn 0.9049 0.0758 -0.4189\n' +
        'vn 0.9135 -0.2316 -0.3345\n' +
        'vn 0.8871 -0.3201 -0.3325\n' +
        'vn 0.9473 -0.1559 -0.2798\n' +
        'vn 0.9049 -0.0758 -0.4189\n' +
        'vn 0.8990 0.3957 -0.1878\n' +
        'vn 0.8224 0.4976 -0.2759\n' +
        'vn 0.8651 0.4111 -0.2875\n' +
        'vn 0.9405 0.2810 -0.1911\n' +
        'vn 0.8651 -0.4111 -0.2875\n' +
        'vn 0.8224 -0.4976 -0.2759\n' +
        'vn 0.8990 -0.3957 -0.1878\n' +
        'vn 0.9405 -0.2810 -0.1911\n' +
        'vn 0.8509 0.4363 -0.2926\n' +
        'vn 0.8002 0.4893 -0.3468\n' +
        'vn 0.7998 0.5223 -0.2958\n' +
        'vn 0.8649 0.4432 -0.2356\n' +
        'vn 0.7998 -0.5223 -0.2958\n' +
        'vn 0.8002 -0.4893 -0.3468\n' +
        'vn 0.8509 -0.4363 -0.2926\n' +
        'vn 0.8649 -0.4432 -0.2356\n' +
        'vn 0.8692 0.3294 -0.3687\n' +
        'vn 0.8004 0.3740 -0.4684\n' +
        'vn 0.7924 0.4284 -0.4343\n' +
        'vn 0.8401 0.4004 -0.3659\n' +
        'vn 0.7924 -0.4284 -0.4343\n' +
        'vn 0.8004 -0.3740 -0.4684\n' +
        'vn 0.8692 -0.3294 -0.3687\n' +
        'vn 0.8401 -0.4004 -0.3659\n' +
        'vn 0.9657 0.2520 -0.0625\n' +
        'vn 0.9205 0.3388 -0.1946\n' +
        'vn 0.8521 0.3568 -0.3828\n' +
        'vn 0.9337 0.2911 -0.2083\n' +
        'vn 0.8521 -0.3568 -0.3828\n' +
        'vn 0.9205 -0.3388 -0.1946\n' +
        'vn 0.9657 -0.2520 -0.0625\n' +
        'vn 0.9337 -0.2911 -0.2083\n' +
        'vn 0.9969 0.0732 0.0278\n' +
        'vn 0.9965 -0.0697 0.0455\n' +
        'vn 0.9907 -0.0939 0.0984\n' +
        'vn 0.9993 0.0359 0.0043\n' +
        'vn 0.9907 0.0939 0.0984\n' +
        'vn 0.9965 0.0697 0.0455\n' +
        'vn 0.9969 -0.0732 0.0278\n' +
        'vn 0.9993 -0.0359 0.0043\n' +
        'vn 0.8982 0.3329 -0.2872\n' +
        'vn 0.9697 0.1299 -0.2069\n' +
        'vn 0.9716 0.0913 -0.2181\n' +
        'vn 0.9395 0.2471 -0.2373\n' +
        'vn 0.9716 -0.0913 -0.2181\n' +
        'vn 0.9697 -0.1299 -0.2069\n' +
        'vn 0.8982 -0.3329 -0.2872\n' +
        'vn 0.9395 -0.2471 -0.2373\n' +
        'vn 0.9678 0.1550 -0.1983\n' +
        'vn 0.9676 0.0737 -0.2413\n' +
        'vn 0.9666 0.0473 -0.2518\n' +
        'vn 0.9801 0.0581 -0.1896\n' +
        'vn 0.9666 -0.0473 -0.2518\n' +
        'vn 0.9676 -0.0737 -0.2413\n' +
        'vn 0.9678 -0.1550 -0.1983\n' +
        'vn 0.9801 -0.0581 -0.1896\n' +
        'vn 0.9985 -0.0120 -0.0527\n' +
        'vn 0.9953 -0.0521 -0.0816\n' +
        'vn 0.9851 -0.0128 -0.1716\n' +
        'vn 0.9795 0.0168 -0.2009\n' +
        'vn 0.9851 0.0128 -0.1716\n' +
        'vn 0.9953 0.0521 -0.0816\n' +
        'vn 0.9985 0.0120 -0.0527\n' +
        'vn 0.9795 -0.0168 -0.2009\n' +
        'vn 0.7571 0.0932 -0.6466\n' +
        'vn 0.7388 0.0304 -0.6732\n' +
        'vn 0.6464 0.0427 -0.7618\n' +
        'vn 0.6609 0.1145 -0.7417\n' +
        'vn 0.6464 -0.0427 -0.7618\n' +
        'vn 0.7388 -0.0304 -0.6732\n' +
        'vn 0.7571 -0.0932 -0.6466\n' +
        'vn 0.6609 -0.1145 -0.7417\n' +
        'vn 0.8628 0.2547 -0.4366\n' +
        'vn 0.8042 0.1636 -0.5714\n' +
        'vn 0.7057 0.1891 -0.6828\n' +
        'vn 0.7862 0.3043 -0.5378\n' +
        'vn 0.7057 -0.1891 -0.6828\n' +
        'vn 0.8042 -0.1636 -0.5714\n' +
        'vn 0.8628 -0.2547 -0.4366\n' +
        'vn 0.7862 -0.3043 -0.5378\n' +
        'vn 0.9274 0.3213 -0.1914\n' +
        'vn 0.9002 0.3200 -0.2955\n' +
        'vn 0.8413 0.3886 -0.3757\n' +
        'vn 0.8665 0.4236 -0.2642\n' +
        'vn 0.8413 -0.3886 -0.3757\n' +
        'vn 0.9002 -0.3200 -0.2955\n' +
        'vn 0.9274 -0.3213 -0.1914\n' +
        'vn 0.8665 -0.4236 -0.2642\n' +
        'vn 0.8720 0.4889 0.0247\n' +
        'vn 0.9625 0.2708 -0.0165\n' +
        'vn 0.9604 0.2764 -0.0363\n' +
        'vn 0.8768 0.4808 -0.0060\n' +
        'vn 0.9604 -0.2764 -0.0363\n' +
        'vn 0.9625 -0.2708 -0.0165\n' +
        'vn 0.8720 -0.4889 0.0247\n' +
        'vn 0.8768 -0.4808 -0.0060\n' +
        'vn 0.9443 0.2990 -0.1377\n' +
        'vn 0.8746 0.4572 -0.1612\n' +
        'vn 0.8750 0.4808 -0.0570\n' +
        'vn 0.9546 0.2907 -0.0647\n' +
        'vn 0.8750 -0.4808 -0.0570\n' +
        'vn 0.8746 -0.4572 -0.1612\n' +
        'vn 0.9443 -0.2990 -0.1377\n' +
        'vn 0.9546 -0.2907 -0.0647\n' +
        'vn 0.9900 0.1241 -0.0670\n' +
        'vn 0.9974 0.0240 -0.0680\n' +
        'vn 0.9998 0.0184 -0.0064\n' +
        'vn 0.9933 0.1151 -0.0051\n' +
        'vn 0.9998 -0.0184 -0.0064\n' +
        'vn 0.9974 -0.0240 -0.0680\n' +
        'vn 0.9900 -0.1241 -0.0670\n' +
        'vn 0.9933 -0.1151 -0.0051\n' +
        'vn 0.9919 0.1168 -0.0506\n' +
        'vn 0.9927 0.1156 -0.0340\n' +
        'vn 0.9990 0.0185 -0.0405\n' +
        'vn 0.9983 0.0181 -0.0553\n' +
        'vn 0.9990 -0.0185 -0.0405\n' +
        'vn 0.9927 -0.1156 -0.0340\n' +
        'vn 0.9919 -0.1168 -0.0506\n' +
        'vn 0.9983 -0.0181 -0.0553\n' +
        'vn 0.9971 0.0218 -0.0729\n' +
        'vn 0.9875 0.1342 -0.0829\n' +
        'vn 0.9905 0.1269 -0.0531\n' +
        'vn 0.9987 0.0203 -0.0461\n' +
        'vn 0.9905 -0.1269 -0.0531\n' +
        'vn 0.9875 -0.1342 -0.0829\n' +
        'vn 0.9971 -0.0218 -0.0729\n' +
        'vn 0.9987 -0.0203 -0.0461\n' +
        'vn 0.3566 0.8908 -0.2815\n' +
        'vn 0.1337 0.9264 -0.3520\n' +
        'vn 0.3171 0.6448 -0.6955\n' +
        'vn 0.6417 0.6029 -0.4740\n' +
        'vn 0.3171 -0.6448 -0.6955\n' +
        'vn 0.1337 -0.9264 -0.3520\n' +
        'vn 0.3566 -0.8908 -0.2815\n' +
        'vn 0.6417 -0.6029 -0.4740\n' +
        'vn 0.1759 0.8329 0.5246\n' +
        'vn -0.0466 0.8651 0.4993\n' +
        'vn 0.0447 0.9935 0.1048\n' +
        'vn 0.1992 0.9717 0.1269\n' +
        'vn 0.0447 -0.9935 0.1048\n' +
        'vn -0.0466 -0.8651 0.4994\n' +
        'vn 0.1759 -0.8329 0.5246\n' +
        'vn 0.1992 -0.9717 0.1269\n' +
        'vn 0.7548 -0.0778 0.6514\n' +
        'vn 0.0905 -0.1344 0.9868\n' +
        'vn -0.1093 0.4314 0.8955\n' +
        'vn 0.5220 0.3524 0.7767\n' +
        'vn -0.1093 -0.4314 0.8955\n' +
        'vn 0.0905 0.1344 0.9868\n' +
        'vn 0.7548 0.0778 0.6514\n' +
        'vn 0.5220 -0.3524 0.7767\n' +
        'vn 0.5392 -0.5774 0.6131\n' +
        'vn 0.1418 -0.5690 0.8100\n' +
        'vn 0.3080 -0.5857 0.7497\n' +
        'vn 0.8509 -0.3525 0.3896\n' +
        'vn 0.3080 0.5857 0.7497\n' +
        'vn 0.1418 0.5690 0.8100\n' +
        'vn 0.5392 0.5774 0.6131\n' +
        'vn 0.8509 0.3525 0.3896\n' +
        'vn 0.8774 0.0951 -0.4702\n' +
        'vn 0.8228 0.2846 -0.4919\n' +
        'vn 0.4651 0.4156 -0.7816\n' +
        'vn 0.5294 0.1712 -0.8309\n' +
        'vn 0.4651 -0.4156 -0.7816\n' +
        'vn 0.8228 -0.2846 -0.4919\n' +
        'vn 0.8774 -0.0951 -0.4702\n' +
        'vn 0.5294 -0.1712 -0.8309\n' +
        'vn 0.6489 0.1483 -0.7463\n' +
        'vn 0.5966 0.3436 -0.7253\n' +
        'vn 0.7691 0.2190 -0.6005\n' +
        'vn 0.8299 0.0889 -0.5508\n' +
        'vn 0.7691 -0.2190 -0.6005\n' +
        'vn 0.5966 -0.3436 -0.7253\n' +
        'vn 0.6489 -0.1483 -0.7463\n' +
        'vn 0.8299 -0.0889 -0.5508\n' +
        'vn 0.3539 -0.4226 0.8343\n' +
        'vn 0.8176 -0.2218 0.5313\n' +
        'vn 0.7598 -0.2964 0.5786\n' +
        'vn 0.4204 -0.4952 0.7603\n' +
        'vn 0.7598 0.2963 0.5786\n' +
        'vn 0.8176 0.2218 0.5313\n' +
        'vn 0.3540 0.4226 0.8343\n' +
        'vn 0.4204 0.4952 0.7603\n' +
        'vn 0.3780 -0.1131 0.9189\n' +
        'vn 0.7479 -0.0287 0.6632\n' +
        'vn 0.7533 0.2606 0.6038\n' +
        'vn 0.3236 0.4246 0.8456\n' +
        'vn 0.7533 -0.2606 0.6038\n' +
        'vn 0.7479 0.0287 0.6632\n' +
        'vn 0.3780 0.1131 0.9189\n' +
        'vn 0.3236 -0.4246 0.8456\n' +
        'vn 0.3495 0.8099 0.4711\n' +
        'vn 0.7780 0.5218 0.3500\n' +
        'vn 0.8607 0.5040 0.0718\n' +
        'vn 0.4001 0.9108 0.1023\n' +
        'vn 0.8607 -0.5040 0.0718\n' +
        'vn 0.7780 -0.5218 0.3500\n' +
        'vn 0.3495 -0.8099 0.4711\n' +
        'vn 0.4001 -0.9108 0.1023\n' +
        'vn 0.4453 0.8078 -0.3862\n' +
        'vn 0.8501 0.4118 -0.3282\n' +
        'vn 0.7498 0.3141 -0.5824\n' +
        'vn 0.5130 0.5062 -0.6933\n' +
        'vn 0.7498 -0.3141 -0.5824\n' +
        'vn 0.8501 -0.4118 -0.3282\n' +
        'vn 0.4453 -0.8078 -0.3862\n' +
        'vn 0.5130 -0.5062 -0.6933\n' +
        'vn 0.9872 -0.0096 0.1590\n' +
        'vn 0.9896 0.1295 0.0624\n' +
        'vn 0.9431 0.1560 0.2937\n' +
        'vn 0.9359 -0.0173 0.3518\n' +
        'vn 0.9431 -0.1559 0.2937\n' +
        'vn 0.9896 -0.1295 0.0624\n' +
        'vn 0.9872 0.0096 0.1590\n' +
        'vn 0.9359 0.0173 0.3518\n' +
        'vn 0.9888 -0.0172 -0.1481\n' +
        'vn 0.9214 0.0330 -0.3872\n' +
        'vn 0.8869 0.1178 -0.4467\n' +
        'vn 0.9677 0.0955 -0.2333\n' +
        'vn 0.8869 -0.1178 -0.4467\n' +
        'vn 0.9214 -0.0330 -0.3872\n' +
        'vn 0.9888 0.0172 -0.1481\n' +
        'vn 0.9677 -0.0955 -0.2333\n' +
        'vn 0.9966 -0.0824 0.0079\n' +
        'vn 0.9815 -0.1693 -0.0894\n' +
        'vn 0.9998 -0.0018 0.0194\n' +
        'vn 0.9888 -0.1482 0.0169\n' +
        'vn 0.9998 0.0018 0.0194\n' +
        'vn 0.9815 0.1693 -0.0894\n' +
        'vn 0.9966 0.0824 0.0079\n' +
        'vn 0.9888 0.1482 0.0169\n' +
        'vn 0.9910 0.1003 -0.0880\n' +
        'vn 0.7785 0.6257 -0.0497\n' +
        'vn 0.6650 0.7408 -0.0948\n' +
        'vn 0.8783 0.4400 -0.1871\n' +
        'vn 0.6650 -0.7408 -0.0948\n' +
        'vn 0.7785 -0.6257 -0.0498\n' +
        'vn 0.9910 -0.1003 -0.0880\n' +
        'vn 0.8783 -0.4400 -0.1871\n' +
        'vn 0.7438 0.6450 -0.1751\n' +
        'vn 0.8702 0.4574 -0.1830\n' +
        'vn 0.7436 0.6685 0.0089\n' +
        'vn 0.6642 0.7448 -0.0644\n' +
        'vn 0.7436 -0.6685 0.0089\n' +
        'vn 0.8702 -0.4574 -0.1830\n' +
        'vn 0.7438 -0.6450 -0.1751\n' +
        'vn 0.6642 -0.7448 -0.0644\n' +
        'vn 0.9415 0.3356 -0.0302\n' +
        'vn 0.9606 0.2778 0.0082\n' +
        'vn 0.8526 0.5189 0.0614\n' +
        'vn 0.8111 0.5804 0.0725\n' +
        'vn 0.8526 -0.5189 0.0614\n' +
        'vn 0.9606 -0.2778 0.0082\n' +
        'vn 0.9415 -0.3356 -0.0302\n' +
        'vn 0.8111 -0.5804 0.0725\n' +
        'vn 0.3491 0.9069 0.2358\n' +
        'vn 0.3256 0.8977 0.2969\n' +
        'vn 0.5733 0.7929 0.2062\n' +
        'vn 0.6365 0.7549 0.1580\n' +
        'vn 0.5733 -0.7929 0.2062\n' +
        'vn 0.3256 -0.8977 0.2969\n' +
        'vn 0.3491 -0.9069 0.2358\n' +
        'vn 0.6365 -0.7549 0.1580\n' +
        'vn 0.3048 0.9094 0.2829\n' +
        'vn 0.2888 0.9263 0.2419\n' +
        'vn 0.4575 0.8815 0.1166\n' +
        'vn 0.5113 0.8393 0.1847\n' +
        'vn 0.4575 -0.8815 0.1166\n' +
        'vn 0.2888 -0.9263 0.2419\n' +
        'vn 0.3048 -0.9094 0.2829\n' +
        'vn 0.5113 -0.8393 0.1847\n' +
        'vn 0.3618 0.7756 -0.5172\n' +
        'vn 0.5583 0.7739 -0.2991\n' +
        'vn 0.4317 0.9019 0.0164\n' +
        'vn 0.2834 0.9526 0.1103\n' +
        'vn 0.4317 -0.9019 0.0164\n' +
        'vn 0.5583 -0.7739 -0.2991\n' +
        'vn 0.3618 -0.7756 -0.5172\n' +
        'vn 0.2834 -0.9526 0.1103\n' +
        'vn 0.9680 0.0821 -0.2370\n' +
        'vn 0.9363 0.0372 -0.3492\n' +
        'vn 0.4662 0.0844 -0.8807\n' +
        'vn 0.4916 -0.0308 -0.8703\n' +
        'vn 0.4662 -0.0844 -0.8807\n' +
        'vn 0.9363 -0.0372 -0.3492\n' +
        'vn 0.9680 -0.0821 -0.2370\n' +
        'vn 0.4916 0.0308 -0.8703\n' +
        'vn 0.9505 0.1784 -0.2543\n' +
        'vn 0.9691 0.1686 -0.1802\n' +
        'vn 0.6177 -0.6184 -0.4858\n' +
        'vn 0.6903 -0.7183 -0.0864\n' +
        'vn 0.6177 0.6184 -0.4858\n' +
        'vn 0.9691 -0.1686 -0.1802\n' +
        'vn 0.9505 -0.1784 -0.2543\n' +
        'vn 0.6903 0.7183 -0.0864\n' +
        'vn 0.9170 0.0416 -0.3966\n' +
        'vn 0.9319 0.1094 -0.3458\n' +
        'vn 0.7542 -0.6404 0.1454\n' +
        'vn 0.7771 -0.5087 0.3706\n' +
        'vn 0.7542 0.6404 0.1454\n' +
        'vn 0.9319 -0.1094 -0.3458\n' +
        'vn 0.9170 -0.0416 -0.3966\n' +
        'vn 0.7771 0.5087 0.3706\n' +
        'vn 0.9191 0.0008 -0.3939\n' +
        'vn 0.9163 0.0108 -0.4003\n' +
        'vn 0.7583 -0.3058 0.5757\n' +
        'vn 0.7379 -0.0854 0.6695\n' +
        'vn 0.7583 0.3058 0.5757\n' +
        'vn 0.9163 -0.0108 -0.4003\n' +
        'vn 0.9191 -0.0008 -0.3939\n' +
        'vn 0.7379 0.0854 0.6695\n' +
        'vn 0.4532 -0.0972 0.8861\n' +
        'vn 0.4204 -0.3538 0.8355\n' +
        'vn 0.7104 -0.2657 0.6517\n' +
        'vn 0.7776 -0.0740 0.6243\n' +
        'vn 0.7104 0.2657 0.6517\n' +
        'vn 0.4204 0.3538 0.8355\n' +
        'vn 0.4532 0.0972 0.8861\n' +
        'vn 0.7776 0.0740 0.6243\n' +
        'vn 0.3398 -0.6259 0.7020\n' +
        'vn 0.2389 -0.8526 0.4647\n' +
        'vn 0.2420 -0.8368 0.4911\n' +
        'vn 0.5021 -0.5515 0.6661\n' +
        'vn 0.2419 0.8368 0.4911\n' +
        'vn 0.2389 0.8526 0.4647\n' +
        'vn 0.3398 0.6259 0.7020\n' +
        'vn 0.5021 0.5515 0.6661\n' +
        'vn 0.1592 -0.9817 0.1045\n' +
        'vn 0.1939 -0.8118 -0.5508\n' +
        'vn 0.4131 -0.6476 -0.6403\n' +
        'vn 0.1765 -0.9782 0.1090\n' +
        'vn 0.4131 0.6476 -0.6403\n' +
        'vn 0.1939 0.8118 -0.5508\n' +
        'vn 0.1592 0.9817 0.1045\n' +
        'vn 0.1765 0.9782 0.1090\n' +
        'vn 0.2545 -0.0206 -0.9669\n' +
        'vn 0.2627 0.0902 -0.9607\n' +
        'vn 0.5233 0.0729 -0.8490\n' +
        'vn 0.5024 0.0243 -0.8643\n' +
        'vn 0.5233 -0.0729 -0.8490\n' +
        'vn 0.2627 -0.0902 -0.9607\n' +
        'vn 0.2545 0.0206 -0.9669\n' +
        'vn 0.5024 -0.0243 -0.8643\n' +
        'vn 0.8737 0.0317 -0.4855\n' +
        'vn 0.9977 -0.0095 -0.0665\n' +
        'vn 0.9983 -0.0206 -0.0539\n' +
        'vn 0.8617 0.0541 -0.5045\n' +
        'vn 0.9983 0.0206 -0.0539\n' +
        'vn 0.9977 0.0095 -0.0665\n' +
        'vn 0.8737 -0.0317 -0.4855\n' +
        'vn 0.8617 -0.0541 -0.5045\n' +
        'vn 0.8536 -0.1293 -0.5047\n' +
        'vn 0.9891 -0.1375 0.0529\n' +
        'vn 0.5918 -0.7919 0.1503\n' +
        'vn 0.5918 0.7919 0.1503\n' +
        'vn 0.9891 0.1375 0.0529\n' +
        'vn 0.8536 0.1293 -0.5047\n' +
        'vn 0.9746 -0.1630 -0.1536\n' +
        'vn 0.9709 -0.1841 -0.1531\n' +
        'vn 0.9654 -0.2130 -0.1505\n' +
        'vn 0.9801 -0.1613 -0.1159\n' +
        'vn 0.9654 0.2130 -0.1505\n' +
        'vn 0.9709 0.1841 -0.1531\n' +
        'vn 0.9746 0.1630 -0.1536\n' +
        'vn 0.9801 0.1613 -0.1159\n' +
        'vn 0.9955 0.0006 -0.0947\n' +
        'vn 0.9885 -0.0960 -0.1171\n' +
        'vn 0.9913 -0.1144 -0.0657\n' +
        'vn 0.9976 -0.0598 -0.0361\n' +
        'vn 0.9913 0.1144 -0.0657\n' +
        'vn 0.9885 0.0960 -0.1171\n' +
        'vn 0.9955 -0.0006 -0.0947\n' +
        'vn 0.9976 0.0598 -0.0361\n' +
        'vn 0.9800 0.1617 -0.1156\n' +
        'vn 0.9908 0.0894 -0.1018\n' +
        'vn 0.9996 -0.0069 -0.0287\n' +
        'vn 0.9993 0.0349 -0.0130\n' +
        'vn 0.9996 0.0069 -0.0287\n' +
        'vn 0.9908 -0.0894 -0.1018\n' +
        'vn 0.9800 -0.1617 -0.1156\n' +
        'vn 0.9993 -0.0349 -0.0130\n' +
        'vn 0.9779 -0.1611 -0.1333\n' +
        'vn 0.9777 -0.0201 -0.2093\n' +
        'vn 0.8984 -0.1669 -0.4063\n' +
        'vn 0.9425 -0.2576 -0.2130\n' +
        'vn 0.8984 0.1669 -0.4063\n' +
        'vn 0.9777 0.0201 -0.2092\n' +
        'vn 0.9779 0.1611 -0.1333\n' +
        'vn 0.9425 0.2577 -0.2130\n' +
        'vn 0.9460 0.1072 -0.3060\n' +
        'vn 0.8850 0.1660 -0.4350\n' +
        'vn 0.8370 0.1018 -0.5376\n' +
        'vn 0.8527 -0.0263 -0.5217\n' +
        'vn 0.8370 -0.1018 -0.5376\n' +
        'vn 0.8850 -0.1660 -0.4350\n' +
        'vn 0.9460 -0.1072 -0.3060\n' +
        'vn 0.8527 0.0263 -0.5217\n' +
        'vn 0.8027 0.2909 -0.5206\n' +
        'vn 0.7730 0.4340 -0.4628\n' +
        'vn 0.7943 0.4282 -0.4310\n' +
        'vn 0.8157 0.2718 -0.5107\n' +
        'vn 0.7943 -0.4282 -0.4310\n' +
        'vn 0.7730 -0.4340 -0.4628\n' +
        'vn 0.8027 -0.2909 -0.5206\n' +
        'vn 0.8157 -0.2718 -0.5107\n' +
        'vn 0.7929 0.4903 -0.3620\n' +
        'vn 0.8318 0.4923 -0.2566\n' +
        'vn 0.8623 0.4683 -0.1926\n' +
        'vn 0.8138 0.4874 -0.3165\n' +
        'vn 0.8623 -0.4683 -0.1926\n' +
        'vn 0.8318 -0.4923 -0.2566\n' +
        'vn 0.7929 -0.4903 -0.3620\n' +
        'vn 0.8138 -0.4874 -0.3165\n' +
        'vn 0.8776 0.4539 -0.1543\n' +
        'vn 0.9176 0.3849 -0.0992\n' +
        'vn 0.9124 0.4036 -0.0676\n' +
        'vn 0.8977 0.4263 -0.1112\n' +
        'vn 0.9124 -0.4036 -0.0676\n' +
        'vn 0.9176 -0.3848 -0.0992\n' +
        'vn 0.8776 -0.4539 -0.1543\n' +
        'vn 0.8977 -0.4263 -0.1112\n' +
        'vn 0.9470 0.3060 -0.0977\n' +
        'vn 0.9522 0.2667 -0.1489\n' +
        'vn 0.9147 0.4041 -0.0043\n' +
        'vn 0.9210 0.3886 -0.0276\n' +
        'vn 0.9147 -0.4041 -0.0043\n' +
        'vn 0.9522 -0.2667 -0.1489\n' +
        'vn 0.9470 -0.3060 -0.0977\n' +
        'vn 0.9210 -0.3886 -0.0276\n' +
        'vn 0.9464 0.2981 -0.1241\n' +
        'vn 0.9508 0.3097 -0.0071\n' +
        'vn 0.8437 0.4302 0.3211\n' +
        'vn 0.8835 0.4527 0.1204\n' +
        'vn 0.8437 -0.4302 0.3211\n' +
        'vn 0.9508 -0.3097 -0.0071\n' +
        'vn 0.9464 -0.2981 -0.1241\n' +
        'vn 0.8835 -0.4527 0.1204\n' +
        'vn 0.9738 0.2274 0.0050\n' +
        'vn 0.9870 0.1322 -0.0914\n' +
        'vn 0.9502 0.1449 0.2759\n' +
        'vn 0.8735 0.2999 0.3834\n' +
        'vn 0.9502 -0.1449 0.2759\n' +
        'vn 0.9870 -0.1322 -0.0914\n' +
        'vn 0.9738 -0.2274 0.0050\n' +
        'vn 0.8735 -0.2999 0.3834\n' +
        'vn 0.9746 0.1638 -0.1528\n' +
        'vn 0.9644 0.2185 -0.1491\n' +
        'vn 0.9793 0.1461 0.1402\n' +
        'vn 0.9749 0.1430 0.1706\n' +
        'vn 0.9793 -0.1461 0.1402\n' +
        'vn 0.9644 -0.2185 -0.1491\n' +
        'vn 0.9746 -0.1638 -0.1528\n' +
        'vn 0.9749 -0.1430 0.1706\n' +
        'vn 0.9640 0.2297 -0.1342\n' +
        'vn 0.9694 0.2117 -0.1243\n' +
        'vn 0.9975 0.0631 0.0323\n' +
        'vn 0.9909 0.0954 0.0953\n' +
        'vn 0.9975 -0.0631 0.0323\n' +
        'vn 0.9694 -0.2117 -0.1243\n' +
        'vn 0.9640 -0.2297 -0.1342\n' +
        'vn 0.9909 -0.0954 0.0953\n' +
        'vn 0.9823 0.1645 -0.0893\n' +
        'vn 0.9600 0.2203 -0.1730\n' +
        'vn 0.8312 0.3746 -0.4109\n' +
        'vn 0.9033 0.2500 -0.3485\n' +
        'vn 0.8312 -0.3746 -0.4109\n' +
        'vn 0.9600 -0.2204 -0.1730\n' +
        'vn 0.9823 -0.1645 -0.0893\n' +
        'vn 0.9033 -0.2500 -0.3485\n' +
        'vn 0.9920 0.1256 -0.0160\n' +
        'vn 0.9838 0.1793 -0.0099\n' +
        'vn 0.9365 0.2298 -0.2648\n' +
        'vn 0.9359 0.1435 -0.3218\n' +
        'vn 0.9365 -0.2298 -0.2648\n' +
        'vn 0.9837 -0.1793 -0.0099\n' +
        'vn 0.9920 -0.1256 -0.0160\n' +
        'vn 0.9359 -0.1435 -0.3218\n' +
        'vn 0.9852 0.1477 -0.0869\n' +
        'vn 0.9989 0.0325 -0.0346\n' +
        'vn 0.8663 -0.0242 -0.4989\n' +
        'vn 0.7144 -0.0623 -0.6969\n' +
        'vn 0.8663 0.0242 -0.4989\n' +
        'vn 0.9989 -0.0325 -0.0346\n' +
        'vn 0.9852 -0.1476 -0.0869\n' +
        'vn 0.7144 0.0623 -0.6969\n' +
        'vn 0.8815 0.2285 -0.4131\n' +
        'vn 0.9217 0.2682 -0.2804\n' +
        'vn 0.6265 -0.0386 -0.7785\n' +
        'vn 0.6809 -0.0474 -0.7309\n' +
        'vn 0.6265 0.0386 -0.7785\n' +
        'vn 0.9217 -0.2682 -0.2804\n' +
        'vn 0.8815 -0.2285 -0.4131\n' +
        'vn 0.6809 0.0474 -0.7309\n' +
        'vn 0.9902 0.0315 -0.1361\n' +
        'vn 0.9389 0.1121 -0.3255\n' +
        'vn 0.8256 -0.1687 -0.5384\n' +
        'vn 0.9223 -0.3150 -0.2242\n' +
        'vn 0.8256 0.1687 -0.5384\n' +
        'vn 0.9389 -0.1121 -0.3255\n' +
        'vn 0.9902 -0.0315 -0.1361\n' +
        'vn 0.9223 0.3150 -0.2242\n' +
        'vn 0.9958 0.0782 0.0478\n' +
        'vn 0.9981 0.0345 -0.0506\n' +
        'vn 0.9448 -0.3272 -0.0184\n' +
        'vn 0.9523 -0.2411 0.1871\n' +
        'vn 0.9448 0.3272 -0.0184\n' +
        'vn 0.9981 -0.0345 -0.0506\n' +
        'vn 0.9958 -0.0782 0.0478\n' +
        'vn 0.9523 0.2411 0.1871\n' +
        'vn 0.9695 0.2224 0.1028\n' +
        'vn 0.9800 0.1584 0.1207\n' +
        'vn 0.9266 -0.1408 0.3486\n' +
        'vn 0.8846 -0.1031 0.4547\n' +
        'vn 0.9266 0.1408 0.3486\n' +
        'vn 0.9800 -0.1584 0.1207\n' +
        'vn 0.9695 -0.2224 0.1028\n' +
        'vn 0.8846 0.1031 0.4547\n' +
        'vn 0.9699 0.2431 0.0134\n' +
        'vn 0.9684 0.2448 0.0477\n' +
        'vn 0.8432 -0.0346 0.5365\n' +
        'vn 0.8150 0.1339 0.5637\n' +
        'vn 0.8432 0.0346 0.5365\n' +
        'vn 0.9684 -0.2448 0.0477\n' +
        'vn 0.9699 -0.2431 0.0134\n' +
        'vn 0.8150 -0.1339 0.5637\n' +
        'vn 0.9735 0.2227 0.0512\n' +
        'vn 0.9710 0.2391 0.0096\n' +
        'vn 0.7878 0.2805 0.5484\n' +
        'vn 0.7553 0.3543 0.5513\n' +
        'vn 0.7878 -0.2805 0.5484\n' +
        'vn 0.9710 -0.2391 0.0096\n' +
        'vn 0.9735 -0.2227 0.0512\n' +
        'vn 0.7553 -0.3543 0.5513\n' +
        'vn 0.9399 0.2669 0.2130\n' +
        'vn 0.9657 0.2034 0.1614\n' +
        'vn 0.7305 0.4210 0.5377\n' +
        'vn 0.7131 0.5522 0.4320\n' +
        'vn 0.7305 -0.4210 0.5377\n' +
        'vn 0.9657 -0.2034 0.1614\n' +
        'vn 0.9399 -0.2669 0.2130\n' +
        'vn 0.7131 -0.5522 0.4320\n' +
        'vn 0.9330 0.3093 -0.1838\n' +
        'vn 0.9130 0.3787 -0.1515\n' +
        'vn 0.6739 0.6768 -0.2965\n' +
        'vn 0.7530 0.5379 -0.3789\n' +
        'vn 0.6739 -0.6768 -0.2965\n' +
        'vn 0.9130 -0.3787 -0.1516\n' +
        'vn 0.9330 -0.3093 -0.1838\n' +
        'vn 0.7530 -0.5379 -0.3789\n' +
        'vn 0.8972 0.4301 -0.0998\n' +
        'vn 0.8856 0.4624 -0.0447\n' +
        'vn 0.6264 0.7785 -0.0403\n' +
        'vn 0.6277 0.7612 -0.1630\n' +
        'vn 0.6264 -0.7785 -0.0403\n' +
        'vn 0.8856 -0.4624 -0.0447\n' +
        'vn 0.8972 -0.4301 -0.0998\n' +
        'vn 0.6277 -0.7612 -0.1630\n' +
        'vn 0.8846 0.4660 0.0164\n' +
        'vn 0.9073 0.4031 0.1197\n' +
        'vn 0.6743 0.6988 0.2386\n' +
        'vn 0.6405 0.7649 0.0685\n' +
        'vn 0.6743 -0.6988 0.2386\n' +
        'vn 0.9073 -0.4031 0.1197\n' +
        'vn 0.8846 -0.4660 0.0164\n' +
        'vn 0.6405 -0.7649 0.0685\n' +
        'vn 0.0417 -0.3578 0.9329\n' +
        'vn -0.0803 -0.7466 0.6604\n' +
        'vn -0.1957 -0.5685 0.7991\n' +
        'vn 0.1224 -0.2670 0.9559\n' +
        'vn -0.1957 0.5685 0.7991\n' +
        'vn -0.0803 0.7466 0.6604\n' +
        'vn 0.0417 0.3578 0.9329\n' +
        'vn 0.1224 0.2670 0.9559\n' +
        'vn -0.1676 -0.8529 0.4945\n' +
        'vn -0.1721 -0.8094 0.5615\n' +
        'vn -0.6005 -0.6667 0.4415\n' +
        'vn -0.5384 -0.6784 0.4998\n' +
        'vn -0.6005 0.6667 0.4415\n' +
        'vn -0.1721 0.8094 0.5615\n' +
        'vn -0.1676 0.8529 0.4945\n' +
        'vn -0.5384 0.6784 0.4998\n' +
        'vn -0.1558 -0.5089 0.8466\n' +
        'vn -0.1260 0.0449 0.9910\n' +
        'vn -0.6137 -0.0784 0.7856\n' +
        'vn -0.6081 -0.4250 0.6705\n' +
        'vn -0.6137 0.0784 0.7856\n' +
        'vn -0.1260 -0.0449 0.9910\n' +
        'vn -0.1558 0.5089 0.8466\n' +
        'vn -0.6081 0.4250 0.6705\n' +
        'vn -0.0966 0.4773 0.8734\n' +
        'vn -0.1080 0.5625 0.8197\n' +
        'vn -0.6154 0.3070 0.7260\n' +
        'vn -0.6207 0.3006 0.7241\n' +
        'vn -0.6154 -0.3070 0.7260\n' +
        'vn -0.1080 -0.5625 0.8197\n' +
        'vn -0.0966 -0.4773 0.8734\n' +
        'vn -0.6207 -0.3006 0.7241\n' +
        'vn -0.0977 0.4901 0.8662\n' +
        'vn -0.0690 0.4382 0.8962\n' +
        'vn -0.2396 0.3608 0.9014\n' +
        'vn -0.4087 0.2716 0.8713\n' +
        'vn -0.2396 -0.3608 0.9014\n' +
        'vn -0.0690 -0.4382 0.8962\n' +
        'vn -0.0977 -0.4901 0.8662\n' +
        'vn -0.4087 -0.2716 0.8713\n' +
        'vn -0.0552 0.4512 0.8907\n' +
        'vn -0.0769 0.7696 0.6339\n' +
        'vn -0.2743 0.6780 0.6820\n' +
        'vn -0.2188 0.3994 0.8903\n' +
        'vn -0.2743 -0.6780 0.6820\n' +
        'vn -0.0769 -0.7696 0.6339\n' +
        'vn -0.0552 -0.4512 0.8907\n' +
        'vn -0.2188 -0.3994 0.8903\n' +
        'vn -0.0783 0.9917 0.1024\n' +
        'vn -0.0540 0.9645 -0.2586\n' +
        'vn -0.1671 0.9687 -0.1835\n' +
        'vn -0.2655 0.9364 0.2296\n' +
        'vn -0.1671 -0.9687 -0.1835\n' +
        'vn -0.0540 -0.9645 -0.2586\n' +
        'vn -0.0783 -0.9917 0.1024\n' +
        'vn -0.2655 -0.9364 0.2296\n' +
        'vn -0.0345 0.8247 -0.5645\n' +
        'vn -0.0204 0.6658 -0.7458\n' +
        'vn -0.0372 0.6784 -0.7337\n' +
        'vn -0.0870 0.8378 -0.5390\n' +
        'vn -0.0372 -0.6784 -0.7337\n' +
        'vn -0.0204 -0.6658 -0.7458\n' +
        'vn -0.0345 -0.8247 -0.5645\n' +
        'vn -0.0870 -0.8378 -0.5390\n' +
        'vn 0.0006 0.5389 -0.8423\n' +
        'vn 0.0359 0.4111 -0.9109\n' +
        'vn -0.0197 0.4152 -0.9095\n' +
        'vn -0.0210 0.5426 -0.8397\n' +
        'vn -0.0197 -0.4152 -0.9095\n' +
        'vn 0.0359 -0.4111 -0.9109\n' +
        'vn 0.0006 -0.5389 -0.8423\n' +
        'vn -0.0210 -0.5426 -0.8397\n' +
        'vn -0.9273 0.1075 -0.3586\n' +
        'vn -0.7571 0.1147 -0.6431\n' +
        'vn -0.6767 0.4009 -0.6175\n' +
        'vn -0.8735 0.3207 -0.3662\n' +
        'vn -0.6767 -0.4009 -0.6175\n' +
        'vn -0.7571 -0.1147 -0.6431\n' +
        'vn -0.9273 -0.1075 -0.3586\n' +
        'vn -0.8735 -0.3207 -0.3662\n' +
        'vn -0.9765 0.0915 -0.1950\n' +
        'vn -0.9785 0.1075 -0.1758\n' +
        'vn -0.9565 0.2451 -0.1580\n' +
        'vn -0.9726 0.1783 -0.1491\n' +
        'vn -0.9565 -0.2451 -0.1580\n' +
        'vn -0.9785 -0.1075 -0.1758\n' +
        'vn -0.9765 -0.0915 -0.1950\n' +
        'vn -0.9726 -0.1783 -0.1491\n' +
        'vn -0.8012 0.0363 -0.5973\n' +
        'vn -0.9278 0.0634 -0.3677\n' +
        'vn -0.9471 0.1101 -0.3016\n' +
        'vn -0.8424 0.0529 -0.5362\n' +
        'vn -0.9471 -0.1101 -0.3016\n' +
        'vn -0.9278 -0.0634 -0.3677\n' +
        'vn -0.8012 -0.0363 -0.5973\n' +
        'vn -0.8424 -0.0529 -0.5362\n' +
        'vn -0.0893 0.1112 -0.9898\n' +
        'vn -0.0569 0.0488 -0.9972\n' +
        'vn -0.4834 0.0365 -0.8747\n' +
        'vn -0.5279 0.0669 -0.8467\n' +
        'vn -0.4834 -0.0365 -0.8747\n' +
        'vn -0.0569 -0.0488 -0.9972\n' +
        'vn -0.0893 -0.1112 -0.9898\n' +
        'vn -0.5279 -0.0669 -0.8467\n' +
        'vn -0.1597 0.3763 -0.9126\n' +
        'vn -0.1244 0.1583 -0.9795\n' +
        'vn -0.5824 0.0772 -0.8092\n' +
        'vn -0.6139 0.2585 -0.7458\n' +
        'vn -0.5824 -0.0772 -0.8092\n' +
        'vn -0.1244 -0.1583 -0.9795\n' +
        'vn -0.1597 -0.3763 -0.9126\n' +
        'vn -0.6139 -0.2585 -0.7458\n' +
        'vn -0.1327 0.9899 -0.0506\n' +
        'vn -0.1659 0.8468 -0.5054\n' +
        'vn -0.6353 0.7059 -0.3130\n' +
        'vn -0.5915 0.8058 0.0283\n' +
        'vn -0.6353 -0.7059 -0.3130\n' +
        'vn -0.1659 -0.8468 -0.5054\n' +
        'vn -0.1327 -0.9899 -0.0506\n' +
        'vn -0.5915 -0.8058 0.0283\n' +
        'vn -0.1385 0.9815 0.1322\n' +
        'vn -0.1358 0.9865 0.0913\n' +
        'vn -0.5411 0.8317 0.1242\n' +
        'vn -0.5098 0.8498 0.1340\n' +
        'vn -0.5411 -0.8317 0.1242\n' +
        'vn -0.1358 -0.9865 0.0913\n' +
        'vn -0.1385 -0.9815 0.1322\n' +
        'vn -0.5098 -0.8498 0.1340\n' +
        'vn -0.9026 0.4296 0.0265\n' +
        'vn -0.9775 0.1948 -0.0813\n' +
        'vn -0.9445 0.3152 -0.0927\n' +
        'vn -0.8397 0.5421 0.0320\n' +
        'vn -0.9445 -0.3152 -0.0927\n' +
        'vn -0.9775 -0.1948 -0.0813\n' +
        'vn -0.9026 -0.4296 0.0265\n' +
        'vn -0.8397 -0.5421 0.0320\n' +
        'vn -0.9449 0.3158 -0.0861\n' +
        'vn -0.9187 0.1964 -0.3426\n' +
        'vn -0.8918 0.0369 -0.4509\n' +
        'vn -0.9724 0.1018 -0.2098\n' +
        'vn -0.8918 -0.0369 -0.4509\n' +
        'vn -0.9187 -0.1964 -0.3426\n' +
        'vn -0.9449 -0.3158 -0.0861\n' +
        'vn -0.9724 -0.1018 -0.2098\n' +
        'vn -0.5232 0.8468 -0.0958\n' +
        'vn -0.7236 0.6887 -0.0458\n' +
        'vn -0.8210 0.5078 -0.2611\n' +
        'vn -0.5732 0.7041 -0.4191\n' +
        'vn -0.8210 -0.5078 -0.2611\n' +
        'vn -0.7236 -0.6887 -0.0458\n' +
        'vn -0.5232 -0.8468 -0.0958\n' +
        'vn -0.5732 -0.7041 -0.4191\n' +
        'vn -0.0955 0.9801 0.1739\n' +
        'vn -0.1311 0.9810 0.1429\n' +
        'vn -0.4715 0.8750 0.1095\n' +
        'vn -0.3900 0.9135 0.1155\n' +
        'vn -0.4715 -0.8750 0.1095\n' +
        'vn -0.1311 -0.9810 0.1429\n' +
        'vn -0.0955 -0.9801 0.1739\n' +
        'vn -0.3900 -0.9135 0.1155\n' +
        'vn 0.0752 0.9608 0.2668\n' +
        'vn 0.1154 0.9901 -0.0795\n' +
        'vn 0.3634 0.9302 -0.0521\n' +
        'vn 0.1349 0.9559 0.2609\n' +
        'vn 0.3634 -0.9302 -0.0521\n' +
        'vn 0.1154 -0.9901 -0.0795\n' +
        'vn 0.0752 -0.9608 0.2668\n' +
        'vn 0.1349 -0.9559 0.2609\n' +
        'vn -0.0392 0.9684 0.2462\n' +
        'vn -0.2804 0.9471 0.1563\n' +
        'vn -0.1041 0.9946 0.0053\n' +
        'vn 0.0162 0.9566 0.2910\n' +
        'vn -0.1041 -0.9946 0.0053\n' +
        'vn -0.2804 -0.9471 0.1563\n' +
        'vn -0.0392 -0.9684 0.2462\n' +
        'vn 0.0162 -0.9566 0.2910\n' +
        'vn 0.1626 0.7562 -0.6338\n' +
        'vn 0.1649 0.9772 0.1338\n' +
        'vn 0.4817 0.8711 -0.0962\n' +
        'vn 0.1524 0.7094 -0.6881\n' +
        'vn 0.4817 -0.8711 -0.0962\n' +
        'vn 0.1649 -0.9772 0.1338\n' +
        'vn 0.1626 -0.7562 -0.6338\n' +
        'vn 0.1524 -0.7094 -0.6881\n' +
        'vn 0.1307 0.3775 -0.9167\n' +
        'vn -0.0488 0.3729 -0.9266\n' +
        'vn -0.0043 0.3135 -0.9496\n' +
        'vn 0.0860 0.3243 -0.9420\n' +
        'vn -0.0043 -0.3135 -0.9496\n' +
        'vn -0.0488 -0.3729 -0.9266\n' +
        'vn 0.1307 -0.3775 -0.9167\n' +
        'vn 0.0860 -0.3243 -0.9420\n' +
        'vn -0.9177 0.1597 -0.3638\n' +
        'vn -0.8611 0.3496 -0.3692\n' +
        'vn -0.7137 0.3425 -0.6110\n' +
        'vn -0.7692 0.1505 -0.6210\n' +
        'vn -0.7137 -0.3425 -0.6110\n' +
        'vn -0.8611 -0.3496 -0.3692\n' +
        'vn -0.9177 -0.1597 -0.3638\n' +
        'vn -0.7692 -0.1505 -0.6210\n' +
        'vn -0.5793 0.1427 -0.8025\n' +
        'vn -0.5230 0.3542 -0.7753\n' +
        'vn -0.3412 0.3587 -0.8689\n' +
        'vn -0.3883 0.1356 -0.9115\n' +
        'vn -0.3412 -0.3587 -0.8689\n' +
        'vn -0.5230 -0.3542 -0.7753\n' +
        'vn -0.5793 -0.1427 -0.8025\n' +
        'vn -0.3883 -0.1356 -0.9115\n' +
        'vn -0.2336 0.1346 -0.9630\n' +
        'vn -0.1832 0.3711 -0.9103\n' +
        'vn -0.0951 0.4258 -0.8998\n' +
        'vn -0.1676 0.1462 -0.9750\n' +
        'vn -0.0951 -0.4258 -0.8998\n' +
        'vn -0.1832 -0.3711 -0.9103\n' +
        'vn -0.2336 -0.1346 -0.9630\n' +
        'vn -0.1676 -0.1462 -0.9750\n' +
        'vn -0.1946 0.1548 -0.9686\n' +
        'vn -0.1447 0.4672 -0.8722\n' +
        'vn -0.3673 0.4623 -0.8071\n' +
        'vn -0.4244 0.1437 -0.8940\n' +
        'vn -0.3673 -0.4623 -0.8071\n' +
        'vn -0.1447 -0.4672 -0.8722\n' +
        'vn -0.1946 -0.1548 -0.9686\n' +
        'vn -0.4244 -0.1437 -0.8940\n' +
        'vn -0.3045 0.9453 -0.1173\n' +
        'vn -0.2820 0.8067 -0.5193\n' +
        'vn 0.0015 0.7634 -0.6459\n' +
        'vn -0.0363 0.9289 -0.3686\n' +
        'vn 0.0015 -0.7634 -0.6459\n' +
        'vn -0.2820 -0.8067 -0.5193\n' +
        'vn -0.3045 -0.9453 -0.1173\n' +
        'vn -0.0363 -0.9289 -0.3686\n' +
        'vn 0.1013 0.8818 -0.4606\n' +
        'vn 0.1515 0.7346 -0.6614\n' +
        'vn 0.1870 0.7845 -0.5913\n' +
        'vn 0.1498 0.9224 -0.3561\n' +
        'vn 0.1870 -0.7845 -0.5913\n' +
        'vn 0.1515 -0.7346 -0.6614\n' +
        'vn 0.1013 -0.8818 -0.4606\n' +
        'vn 0.1498 -0.9224 -0.3561\n' +
        'vn -0.9765 0.1606 0.1435\n' +
        'vn -0.9285 0.3605 0.0891\n' +
        'vn -0.9189 0.3535 -0.1752\n' +
        'vn -0.9782 0.1598 -0.1324\n' +
        'vn -0.9189 -0.3535 -0.1752\n' +
        'vn -0.9285 -0.3605 0.0891\n' +
        'vn -0.9765 -0.1606 0.1435\n' +
        'vn -0.9782 -0.1598 -0.1324\n' +
        'vn 0.4223 0.0713 0.9036\n' +
        'vn 0.4210 0.2536 0.8709\n' +
        'vn 0.1316 0.2210 0.9664\n' +
        'vn 0.1295 0.0593 0.9898\n' +
        'vn 0.1316 -0.2210 0.9664\n' +
        'vn 0.4210 -0.2536 0.8709\n' +
        'vn 0.4223 -0.0713 0.9036\n' +
        'vn 0.1295 -0.0593 0.9898\n' +
        'vn -0.1106 0.0603 0.9920\n' +
        'vn -0.1153 0.2114 0.9706\n' +
        'vn -0.4105 0.2446 0.8784\n' +
        'vn -0.3866 0.0860 0.9182\n' +
        'vn -0.4105 -0.2446 0.8784\n' +
        'vn -0.1153 -0.2114 0.9706\n' +
        'vn -0.1106 -0.0603 0.9920\n' +
        'vn -0.3866 -0.0860 0.9182\n' +
        'vn -0.6643 0.1314 0.7358\n' +
        'vn -0.6698 0.3131 0.6733\n' +
        'vn -0.8327 0.3601 0.4207\n' +
        'vn -0.8629 0.1594 0.4796\n' +
        'vn -0.8327 -0.3601 0.4207\n' +
        'vn -0.6698 -0.3131 0.6733\n' +
        'vn -0.6643 -0.1314 0.7358\n' +
        'vn -0.8629 -0.1594 0.4796\n' +
        'vn -0.1208 0.4351 0.8922\n' +
        'vn -0.1732 0.6902 0.7025\n' +
        'vn 0.1224 0.7306 0.6718\n' +
        'vn 0.2064 0.5091 0.8356\n' +
        'vn 0.1224 -0.7306 0.6718\n' +
        'vn -0.1732 -0.6902 0.7025\n' +
        'vn -0.1208 -0.4351 0.8922\n' +
        'vn 0.2064 -0.5091 0.8356\n' +
        'vn 0.5077 0.5265 0.6820\n' +
        'vn 0.4105 0.7182 0.5619\n' +
        'vn 0.4323 0.7195 0.5436\n' +
        'vn 0.5125 0.5650 0.6467\n' +
        'vn 0.4323 -0.7195 0.5436\n' +
        'vn 0.4105 -0.7182 0.5619\n' +
        'vn 0.5077 -0.5265 0.6820\n' +
        'vn 0.5125 -0.5650 0.6467\n' +
        'vn 0.3034 0.6419 0.7042\n' +
        'vn 0.2416 0.7795 0.5779\n' +
        'vn 0.0363 0.8226 0.5674\n' +
        'vn 0.0686 0.6834 0.7268\n' +
        'vn 0.0363 -0.8226 0.5674\n' +
        'vn 0.2416 -0.7795 0.5779\n' +
        'vn 0.3034 -0.6419 0.7042\n' +
        'vn 0.0686 -0.6834 0.7268\n' +
        'vn -0.1357 0.6961 0.7050\n' +
        'vn -0.1225 0.8406 0.5276\n' +
        'vn -0.3331 0.8171 0.4705\n' +
        'vn -0.4153 0.6750 0.6098\n' +
        'vn -0.3331 -0.8171 0.4705\n' +
        'vn -0.1225 -0.8406 0.5276\n' +
        'vn -0.1357 -0.6961 0.7050\n' +
        'vn -0.4153 -0.6750 0.6098\n' +
        'vn -0.6675 0.7383 0.0970\n' +
        'vn -0.7767 0.6153 0.1347\n' +
        'vn -0.6749 0.6283 0.3870\n' +
        'vn -0.5665 0.7775 0.2729\n' +
        'vn -0.6749 -0.6283 0.3870\n' +
        'vn -0.7767 -0.6153 0.1347\n' +
        'vn -0.6675 -0.7383 0.0970\n' +
        'vn -0.5665 -0.7775 0.2729\n' +
        'vn -0.8252 0.4494 0.3422\n' +
        'vn -0.6916 0.4103 0.5944\n' +
        'vn -0.7043 0.5076 0.4963\n' +
        'vn -0.8146 0.5294 0.2370\n' +
        'vn -0.7043 -0.5076 0.4963\n' +
        'vn -0.6916 -0.4103 0.5944\n' +
        'vn -0.8252 -0.4494 0.3422\n' +
        'vn -0.8146 -0.5294 0.2370\n' +
        'vn -0.4339 0.4072 0.8037\n' +
        'vn -0.1226 0.4423 0.8885\n' +
        'vn -0.1289 0.6230 0.7715\n' +
        'vn -0.4355 0.5612 0.7038\n' +
        'vn -0.1289 -0.6230 0.7715\n' +
        'vn -0.1226 -0.4423 0.8885\n' +
        'vn -0.4339 -0.4072 0.8037\n' +
        'vn -0.4355 -0.5612 0.7038\n' +
        'vn 0.1146 0.4777 0.8710\n' +
        'vn 0.3727 0.5164 0.7710\n' +
        'vn 0.3138 0.6596 0.6830\n' +
        'vn 0.0854 0.6483 0.7565\n' +
        'vn 0.3138 -0.6596 0.6830\n' +
        'vn 0.3727 -0.5164 0.7710\n' +
        'vn 0.1146 -0.4777 0.8710\n' +
        'vn 0.0854 -0.6483 0.7565\n' +
        'vn 0.5793 0.5289 0.6201\n' +
        'vn 0.6053 0.4967 0.6220\n' +
        'vn 0.5165 0.5925 0.6182\n' +
        'vn 0.5045 0.6389 0.5808\n' +
        'vn 0.5165 -0.5925 0.6182\n' +
        'vn 0.6053 -0.4967 0.6220\n' +
        'vn 0.5793 -0.5289 0.6201\n' +
        'vn 0.5045 -0.6389 0.5808\n' +
        'vn -0.2276 0.2008 0.9528\n' +
        'vn -0.1236 0.3636 0.9233\n' +
        'vn 0.2482 0.4858 0.8381\n' +
        'vn 0.3477 0.3695 0.8617\n' +
        'vn 0.2482 -0.4858 0.8381\n' +
        'vn -0.1236 -0.3636 0.9233\n' +
        'vn -0.2276 -0.2008 0.9528\n' +
        'vn 0.3477 -0.3695 0.8617\n' +
        'vn 0.7387 0.1140 0.6643\n' +
        'vn 0.7036 0.2962 0.6459\n' +
        'vn 0.6583 0.2889 0.6951\n' +
        'vn 0.6716 0.0921 0.7351\n' +
        'vn 0.6583 -0.2889 0.6951\n' +
        'vn 0.7036 -0.2962 0.6459\n' +
        'vn 0.7387 -0.1140 0.6643\n' +
        'vn 0.6716 -0.0921 0.7351\n' +
        'vn -0.8571 -0.3337 0.3926\n' +
        'vn -0.8764 -0.3447 0.3364\n' +
        'vn -0.9093 -0.0858 0.4073\n' +
        'vn -0.8935 -0.1166 0.4337\n' +
        'vn -0.9093 0.0858 0.4073\n' +
        'vn -0.8764 0.3447 0.3364\n' +
        'vn -0.8571 0.3337 0.3926\n' +
        'vn -0.8935 0.1166 0.4337\n' +
        'vn 0.1410 -0.1515 0.9784\n' +
        'vn -0.2343 -0.0788 0.9690\n' +
        'vn 0.5207 0.2042 0.8289\n' +
        'vn 0.6668 0.0847 0.7405\n' +
        'vn 0.5208 -0.2042 0.8289\n' +
        'vn -0.2343 0.0788 0.9690\n' +
        'vn 0.1410 0.1515 0.9784\n' +
        'vn 0.6668 -0.0847 0.7405\n' +
        'vn 0.7082 -0.0866 0.7007\n' +
        'vn 0.5257 -0.2927 0.7988\n' +
        'vn 0.8126 -0.0270 0.5822\n' +
        'vn 0.8126 0.0270 0.5822\n' +
        'vn 0.5257 0.2927 0.7988\n' +
        'vn 0.7082 0.0866 0.7007\n' +
        'vn -0.1157 0.9450 0.3058\n' +
        'vn 0.0198 0.9922 -0.1234\n' +
        'vn 0.1220 0.9922 -0.0246\n' +
        'vn 0.0927 0.9346 0.3435\n' +
        'vn 0.1220 -0.9922 -0.0246\n' +
        'vn 0.0198 -0.9922 -0.1234\n' +
        'vn -0.1157 -0.9450 0.3058\n' +
        'vn 0.0927 -0.9346 0.3435\n' +
        'vn 0.1599 0.9870 0.0188\n' +
        'vn 0.1165 0.9926 0.0346\n' +
        'vn 0.2703 0.9272 0.2591\n' +
        'vn 0.2670 0.9247 0.2713\n' +
        'vn 0.2703 -0.9272 0.2591\n' +
        'vn 0.1165 -0.9926 0.0346\n' +
        'vn 0.1599 -0.9870 0.0188\n' +
        'vn 0.2670 -0.9247 0.2713\n' +
        'vn 0.0605 0.9950 0.0796\n' +
        'vn -0.0384 0.9811 0.1897\n' +
        'vn -0.0272 0.9543 0.2976\n' +
        'vn 0.1205 0.9461 0.3006\n' +
        'vn -0.0272 -0.9543 0.2976\n' +
        'vn -0.0384 -0.9811 0.1897\n' +
        'vn 0.0605 -0.9950 0.0796\n' +
        'vn 0.1205 -0.9461 0.3006\n' +
        'vn -0.4145 0.8974 0.1514\n' +
        'vn -0.2933 0.9319 0.2132\n' +
        'vn -0.1258 0.9578 0.2584\n' +
        'vn -0.1796 0.9550 0.2360\n' +
        'vn -0.1258 -0.9578 0.2584\n' +
        'vn -0.2933 -0.9319 0.2132\n' +
        'vn -0.4145 -0.8974 0.1514\n' +
        'vn -0.1796 -0.9550 0.2360\n' +
        'vn 0.0056 0.6265 -0.7794\n' +
        'vn -0.1029 0.5659 -0.8180\n' +
        'vn -0.0691 0.5993 -0.7975\n' +
        'vn 0.0749 0.6345 -0.7693\n' +
        'vn -0.0691 -0.5993 -0.7975\n' +
        'vn -0.1029 -0.5659 -0.8180\n' +
        'vn 0.0056 -0.6265 -0.7794\n' +
        'vn 0.0749 -0.6345 -0.7693\n' +
        'vn 0.1437 0.5075 -0.8496\n' +
        'vn 0.0922 0.4865 -0.8688\n' +
        'vn -0.0712 0.4576 -0.8863\n' +
        'vn 0.0190 0.3479 -0.9373\n' +
        'vn -0.0712 -0.4576 -0.8863\n' +
        'vn 0.0922 -0.4865 -0.8688\n' +
        'vn 0.1437 -0.5075 -0.8496\n' +
        'vn 0.0190 -0.3479 -0.9373\n' +
        'vn 0.1595 0.5710 -0.8053\n' +
        'vn 0.1766 0.4782 -0.8603\n' +
        'vn 0.1879 0.5052 -0.8423\n' +
        'vn 0.1891 0.5619 -0.8053\n' +
        'vn 0.1879 -0.5052 -0.8423\n' +
        'vn 0.1766 -0.4782 -0.8603\n' +
        'vn 0.1595 -0.5710 -0.8053\n' +
        'vn 0.1891 -0.5619 -0.8053\n' +
        'vn 0.2484 0.5257 -0.8136\n' +
        'vn 0.4067 0.6807 -0.6093\n' +
        'vn 0.2680 0.7648 -0.5859\n' +
        'vn 0.2046 0.6040 -0.7703\n' +
        'vn 0.2680 -0.7648 -0.5859\n' +
        'vn 0.4067 -0.6807 -0.6093\n' +
        'vn 0.2484 -0.5257 -0.8136\n' +
        'vn 0.2046 -0.6040 -0.7703\n' +
        'vn 0.1539 0.7545 -0.6380\n' +
        'vn 0.1059 0.6955 -0.7107\n' +
        'vn 0.1775 0.6649 -0.7255\n' +
        'vn 0.1775 -0.6649 -0.7255\n' +
        'vn 0.1059 -0.6955 -0.7107\n' +
        'vn 0.1539 -0.7545 -0.6380\n' +
        'vn 0.4087 0.4393 -0.8000\n' +
        'vn 0.3739 0.4824 -0.7921\n' +
        'vn 0.6288 0.5641 -0.5352\n' +
        'vn 0.6288 -0.5641 -0.5352\n' +
        'vn 0.3739 -0.4824 -0.7921\n' +
        'vn 0.4087 -0.4393 -0.8000\n' +
        'vn -0.7533 0.6396 -0.1535\n' +
        'vn -0.7614 0.4685 -0.4482\n' +
        'vn -0.7339 0.5136 -0.4445\n' +
        'vn -0.8018 0.5780 -0.1519\n' +
        'vn -0.7339 -0.5136 -0.4445\n' +
        'vn -0.7614 -0.4685 -0.4482\n' +
        'vn -0.7533 -0.6396 -0.1535\n' +
        'vn -0.8018 -0.5780 -0.1519\n' +
        'vn -0.8903 0.4552 0.0141\n' +
        'vn -0.8394 0.5372 -0.0829\n' +
        'vn -0.7394 0.5639 -0.3678\n' +
        'vn -0.8613 0.4503 -0.2353\n' +
        'vn -0.7394 -0.5639 -0.3678\n' +
        'vn -0.8394 -0.5372 -0.0829\n' +
        'vn -0.8903 -0.4552 0.0141\n' +
        'vn -0.8613 -0.4503 -0.2353\n' +
        'vn -0.2842 0.2214 -0.9329\n' +
        'vn -0.2979 0.4387 -0.8478\n' +
        'vn -0.5224 0.4440 -0.7279\n' +
        'vn -0.5865 0.2672 -0.7646\n' +
        'vn -0.5224 -0.4440 -0.7279\n' +
        'vn -0.2979 -0.4387 -0.8478\n' +
        'vn -0.2842 -0.2214 -0.9329\n' +
        'vn -0.5865 -0.2672 -0.7646\n' +
        'vn -0.2690 0.5496 -0.7909\n' +
        'vn -0.4397 0.5315 -0.7240\n' +
        'vn -0.4098 0.6394 -0.6505\n' +
        'vn -0.2483 0.6033 -0.7579\n' +
        'vn -0.4098 -0.6394 -0.6505\n' +
        'vn -0.4397 -0.5315 -0.7240\n' +
        'vn -0.2690 -0.5496 -0.7909\n' +
        'vn -0.2483 -0.6033 -0.7579\n' +
        'vn -0.8142 0.4411 -0.3774\n' +
        'vn -0.6237 0.6088 -0.4903\n' +
        'vn -0.6379 0.4637 -0.6149\n' +
        'vn -0.6379 -0.4637 -0.6149\n' +
        'vn -0.6237 -0.6088 -0.4903\n' +
        'vn -0.8142 -0.4411 -0.3774\n' +
        'vn 0.4768 -0.0567 0.8772\n' +
        'vn 0.4907 -0.2342 0.8393\n' +
        'vn 0.8885 0.4435 0.1175\n' +
        'vn 0.8572 0.5117 0.0581\n' +
        'vn 0.8885 -0.4435 0.1175\n' +
        'vn 0.4907 0.2342 0.8393\n' +
        'vn 0.4768 0.0567 0.8772\n' +
        'vn 0.8572 -0.5117 0.0581\n' +
        'vn 0.5170 0.1228 0.8471\n' +
        'vn 0.8663 0.4989 -0.0230\n' +
        'vn 0.9036 0.4221 -0.0730\n' +
        'vn 0.6207 0.3808 0.6854\n' +
        'vn 0.9036 -0.4221 -0.0730\n' +
        'vn 0.8663 -0.4989 -0.0230\n' +
        'vn 0.5170 -0.1228 0.8471\n' +
        'vn 0.6207 -0.3808 0.6854\n' +
        'vn 0.7330 0.5521 0.3974\n' +
        'vn 0.9651 0.2553 -0.0593\n' +
        'vn 0.9913 0.1286 -0.0274\n' +
        'vn 0.8127 0.5633 0.1494\n' +
        'vn 0.9913 -0.1286 -0.0274\n' +
        'vn 0.9651 -0.2553 -0.0593\n' +
        'vn 0.7330 -0.5521 0.3974\n' +
        'vn 0.8127 -0.5633 0.1494\n' +
        'vn 0.8321 0.5516 -0.0582\n' +
        'vn 0.9958 0.0910 -0.0120\n' +
        'vn 0.9897 0.1205 0.0776\n' +
        'vn 0.7898 0.5804 -0.1982\n' +
        'vn 0.9897 -0.1205 0.0776\n' +
        'vn 0.9958 -0.0910 -0.0120\n' +
        'vn 0.8321 -0.5516 -0.0582\n' +
        'vn 0.7898 -0.5804 -0.1982\n' +
        'vn 0.6813 0.6244 -0.3820\n' +
        'vn 0.9475 0.2708 0.1700\n' +
        'vn 0.8770 0.4697 0.1014\n' +
        'vn 0.5475 0.5951 -0.5883\n' +
        'vn 0.8770 -0.4697 0.1014\n' +
        'vn 0.9475 -0.2708 0.1700\n' +
        'vn 0.6813 -0.6244 -0.3820\n' +
        'vn 0.5475 -0.5951 -0.5883\n' +
        'vn 0.4656 0.5025 -0.7285\n' +
        'vn 0.8061 0.5874 -0.0727\n' +
        'vn 0.8455 0.5086 -0.1629\n' +
        'vn 0.4660 0.3278 -0.8218\n' +
        'vn 0.8455 -0.5086 -0.1629\n' +
        'vn 0.8061 -0.5874 -0.0727\n' +
        'vn 0.4656 -0.5025 -0.7285\n' +
        'vn 0.4660 -0.3278 -0.8218\n' +
        'vn 0.7327 0.3965 0.5531\n' +
        'vn 0.4684 0.1272 0.8743\n' +
        'vn 0.5072 0.2440 0.8266\n' +
        'vn 0.7702 0.4358 0.4657\n' +
        'vn 0.5072 -0.2440 0.8266\n' +
        'vn 0.4684 -0.1272 0.8743\n' +
        'vn 0.7327 -0.3965 0.5531\n' +
        'vn 0.7702 -0.4358 0.4657\n' +
        'vn 0.7250 -0.2541 0.6402\n' +
        'vn 0.2872 -0.5717 0.7685\n' +
        'vn 0.3799 -0.2163 0.8994\n' +
        'vn 0.7156 0.0927 0.6924\n' +
        'vn 0.3799 0.2163 0.8994\n' +
        'vn 0.2872 0.5717 0.7685\n' +
        'vn 0.7250 0.2541 0.6402\n' +
        'vn 0.7156 -0.0927 0.6924\n' +
        'vn 0.8482 -0.5261 0.0618\n' +
        'vn 0.2940 -0.9481 0.1213\n' +
        'vn 0.2286 -0.8517 0.4716\n' +
        'vn 0.7795 -0.5063 0.3687\n' +
        'vn 0.2286 0.8517 0.4716\n' +
        'vn 0.2940 0.9481 0.1213\n' +
        'vn 0.8482 0.5261 0.0618\n' +
        'vn 0.7796 0.5063 0.3687\n' +
        'vn 0.9240 -0.0353 -0.3808\n' +
        'vn 0.7369 -0.3021 -0.6047\n' +
        'vn 0.5152 -0.8121 -0.2740\n' +
        'vn 0.9091 -0.3761 -0.1788\n' +
        'vn 0.5152 0.8121 -0.2740\n' +
        'vn 0.7369 0.3021 -0.6047\n' +
        'vn 0.9240 0.0353 -0.3808\n' +
        'vn 0.9091 0.3761 -0.1788\n' +
        'vn 0.7414 0.5113 -0.4346\n' +
        'vn 0.6367 0.4687 -0.6123\n' +
        'vn 0.7155 0.2405 -0.6559\n' +
        'vn 0.8262 0.3358 -0.4525\n' +
        'vn 0.7155 -0.2405 -0.6559\n' +
        'vn 0.6367 -0.4687 -0.6123\n' +
        'vn 0.7414 -0.5113 -0.4346\n' +
        'vn 0.8262 -0.3358 -0.4525\n' +
        'vn 0.6940 0.6087 -0.3845\n' +
        'vn 0.6957 0.6390 -0.3282\n' +
        'vn 0.5546 0.6755 -0.4860\n' +
        'vn 0.5784 0.6000 -0.5526\n' +
        'vn 0.5546 -0.6755 -0.4860\n' +
        'vn 0.6957 -0.6390 -0.3282\n' +
        'vn 0.6940 -0.6087 -0.3845\n' +
        'vn 0.5784 -0.6000 -0.5526\n' +
        'vn 0.1218 0.6964 -0.7072\n' +
        'vn 0.1684 0.5057 -0.8461\n' +
        'vn 0.2906 0.8090 -0.5110\n' +
        'vn 0.0026 0.8709 -0.4914\n' +
        'vn 0.2906 -0.8090 -0.5110\n' +
        'vn 0.1684 -0.5057 -0.8461\n' +
        'vn 0.1218 -0.6964 -0.7072\n' +
        'vn 0.0026 -0.8709 -0.4914\n' +
        'vn 0.6408 0.0298 -0.7671\n' +
        'vn 0.5650 0.0403 -0.8241\n' +
        'vn 0.9734 0.2041 0.1043\n' +
        'vn 0.9456 0.2700 0.1814\n' +
        'vn 0.9734 -0.2041 0.1043\n' +
        'vn 0.5650 -0.0403 -0.8241\n' +
        'vn 0.6408 -0.0298 -0.7671\n' +
        'vn 0.9456 -0.2700 0.1814\n' +
        'vn 0.0766 0.9599 -0.2696\n' +
        'vn 0.1152 0.8541 -0.5072\n' +
        'vn -0.0735 0.9182 -0.3893\n' +
        'vn -0.0297 0.9699 -0.2418\n' +
        'vn -0.0735 -0.9182 -0.3893\n' +
        'vn 0.1152 -0.8541 -0.5072\n' +
        'vn 0.0766 -0.9599 -0.2696\n' +
        'vn -0.0297 -0.9699 -0.2418\n' +
        'vn 0.6702 0.4023 0.6237\n' +
        'vn 0.8357 0.5412 -0.0937\n' +
        'vn 0.9333 0.3548 0.0549\n' +
        'vn 0.5442 -0.3578 0.7589\n' +
        'vn 0.9333 -0.3548 0.0549\n' +
        'vn 0.8357 -0.5412 -0.0937\n' +
        'vn 0.6702 -0.4023 0.6237\n' +
        'vn 0.5442 0.3578 0.7589\n' +
        'vn 0.7027 0.1950 0.6843\n' +
        'vn 0.4024 0.1089 0.9090\n' +
        'vn 0.3484 0.2209 0.9109\n' +
        'vn 0.6123 0.3089 0.7278\n' +
        'vn 0.3484 -0.2209 0.9109\n' +
        'vn 0.4024 -0.1089 0.9090\n' +
        'vn 0.7027 -0.1950 0.6843\n' +
        'vn 0.6123 -0.3089 0.7278\n' +
        'vn 0.7095 0.7031 0.0477\n' +
        'vn 0.6238 0.7809 0.0320\n' +
        'vn 0.6595 0.6872 0.3046\n' +
        'vn 0.5905 0.6590 0.4659\n' +
        'vn 0.6595 -0.6872 0.3046\n' +
        'vn 0.6238 -0.7809 0.0320\n' +
        'vn 0.7095 -0.7031 0.0477\n' +
        'vn 0.5905 -0.6590 0.4659\n' +
        'vn 0.4901 0.7818 0.3855\n' +
        'vn 0.5425 0.8009 0.2535\n' +
        'vn 0.7221 0.6438 0.2531\n' +
        'vn 0.6503 0.5578 0.5157\n' +
        'vn 0.7221 -0.6438 0.2531\n' +
        'vn 0.5425 -0.8009 0.2534\n' +
        'vn 0.4901 -0.7818 0.3855\n' +
        'vn 0.6503 -0.5578 0.5157\n' +
        'vn 0.3601 0.7781 -0.5147\n' +
        'vn 0.2625 0.8615 -0.4346\n' +
        'vn 0.1917 0.9324 -0.3064\n' +
        'vn 0.2382 0.9011 -0.3622\n' +
        'vn 0.1917 -0.9324 -0.3064\n' +
        'vn 0.2625 -0.8615 -0.4346\n' +
        'vn 0.3601 -0.7781 -0.5147\n' +
        'vn 0.2382 -0.9011 -0.3622\n' +
        'vn 0.6180 0.6946 -0.3682\n' +
        'vn 0.4341 0.8040 -0.4064\n' +
        'vn 0.5127 0.7035 -0.4921\n' +
        'vn 0.5950 0.6540 -0.4672\n' +
        'vn 0.5127 -0.7035 -0.4921\n' +
        'vn 0.4341 -0.8040 -0.4064\n' +
        'vn 0.6180 -0.6946 -0.3682\n' +
        'vn 0.5950 -0.6540 -0.4672\n' +
        'vn 0.7389 0.5876 -0.3297\n' +
        'vn 0.7323 0.5839 -0.3505\n' +
        'vn 0.6085 0.6486 -0.4573\n' +
        'vn 0.5793 0.6715 -0.4621\n' +
        'vn 0.6085 -0.6486 -0.4573\n' +
        'vn 0.7323 -0.5839 -0.3505\n' +
        'vn 0.7389 -0.5876 -0.3297\n' +
        'vn 0.5793 -0.6715 -0.4621\n' +
        'vn 0.0425 0.9883 -0.1465\n' +
        'vn 0.1646 0.9322 -0.3222\n' +
        'vn 0.4268 0.8788 -0.2133\n' +
        'vn 0.1291 0.9855 0.1100\n' +
        'vn 0.4268 -0.8788 -0.2133\n' +
        'vn 0.1646 -0.9322 -0.3223\n' +
        'vn 0.0425 -0.9883 -0.1465\n' +
        'vn 0.1291 -0.9855 0.1100\n' +
        'vn -0.0126 0.9534 -0.3016\n' +
        'vn -0.1022 0.9243 -0.3678\n' +
        'vn 0.0474 0.9379 -0.3437\n' +
        'vn 0.0501 0.9206 -0.3874\n' +
        'vn 0.0474 -0.9379 -0.3437\n' +
        'vn -0.1022 -0.9243 -0.3678\n' +
        'vn -0.0126 -0.9534 -0.3016\n' +
        'vn 0.0501 -0.9206 -0.3874\n' +
        'vn -0.0669 0.9372 -0.3423\n' +
        'vn 0.3004 0.9538 -0.0079\n' +
        'vn 0.1917 0.9496 -0.2480\n' +
        'vn 0.1917 -0.9496 -0.2480\n' +
        'vn 0.3004 -0.9538 -0.0079\n' +
        'vn -0.0669 -0.9372 -0.3423\n' +
        'vn 0.4501 0.7021 -0.5518\n' +
        'vn 0.4393 0.7118 -0.5481\n' +
        'vn 0.5843 0.6623 -0.4690\n' +
        'vn 0.5997 0.6689 -0.4392\n' +
        'vn 0.5843 -0.6623 -0.4690\n' +
        'vn 0.4393 -0.7118 -0.5481\n' +
        'vn 0.4501 -0.7021 -0.5518\n' +
        'vn 0.5997 -0.6689 -0.4392\n' +
        'vn 0.4262 0.7123 -0.5577\n' +
        'vn 0.3883 0.7130 -0.5838\n' +
        'vn 0.5924 0.6108 -0.5253\n' +
        'vn 0.5863 0.6422 -0.4938\n' +
        'vn 0.5924 -0.6108 -0.5253\n' +
        'vn 0.3883 -0.7130 -0.5838\n' +
        'vn 0.4262 -0.7123 -0.5577\n' +
        'vn 0.5863 -0.6422 -0.4938\n' +
        'vn 0.3023 0.7353 -0.6066\n' +
        'vn 0.2327 0.8550 -0.4634\n' +
        'vn 0.5505 0.7043 -0.4483\n' +
        'vn 0.5793 0.6039 -0.5474\n' +
        'vn 0.5505 -0.7043 -0.4483\n' +
        'vn 0.2327 -0.8550 -0.4634\n' +
        'vn 0.3023 -0.7353 -0.6066\n' +
        'vn 0.5793 -0.6039 -0.5474\n' +
        'vn 0.3933 0.8009 0.4514\n' +
        'vn 0.4332 0.5250 0.7327\n' +
        'vn 0.6206 0.4816 0.6188\n' +
        'vn 0.6641 0.6496 0.3702\n' +
        'vn 0.6206 -0.4816 0.6188\n' +
        'vn 0.4331 -0.5250 0.7327\n' +
        'vn 0.3933 -0.8010 0.4514\n' +
        'vn 0.6641 -0.6496 0.3702\n' +
        'vn 0.5105 0.7196 0.4707\n' +
        'vn 0.5942 0.7918 0.1415\n' +
        'vn 0.6740 0.7258 0.1377\n' +
        'vn 0.6428 0.6333 0.4310\n' +
        'vn 0.6740 -0.7258 0.1377\n' +
        'vn 0.5942 -0.7918 0.1415\n' +
        'vn 0.5105 -0.7196 0.4707\n' +
        'vn 0.6428 -0.6333 0.4310\n' +
        'vn 0.5698 0.8078 -0.1510\n' +
        'vn 0.4843 0.7938 0.3679\n' +
        'vn 0.6763 0.6261 0.3881\n' +
        'vn 0.6666 0.7316 -0.1427\n' +
        'vn 0.6763 -0.6261 0.3881\n' +
        'vn 0.4843 -0.7938 0.3679\n' +
        'vn 0.5698 -0.8078 -0.1510\n' +
        'vn 0.6666 -0.7316 -0.1427\n' +
        'vn 0.2155 0.1581 0.9636\n' +
        'vn 0.2540 0.0267 0.9668\n' +
        'vn 0.4425 -0.0145 0.8967\n' +
        'vn 0.3438 -0.0481 0.9378\n' +
        'vn 0.4425 0.0145 0.8967\n' +
        'vn 0.2540 -0.0267 0.9668\n' +
        'vn 0.2155 -0.1581 0.9636\n' +
        'vn 0.3438 0.0481 0.9378\n' +
        'vn 0.5078 0.5727 -0.6435\n' +
        'vn 0.4704 0.6705 -0.5737\n' +
        'vn 0.6334 0.6608 -0.4028\n' +
        'vn 0.6752 0.6012 -0.4274\n' +
        'vn 0.6334 -0.6608 -0.4028\n' +
        'vn 0.4704 -0.6705 -0.5737\n' +
        'vn 0.5078 -0.5727 -0.6435\n' +
        'vn 0.6752 -0.6012 -0.4274\n' +
        'vn 0.5866 0.1425 -0.7973\n' +
        'vn 0.5489 0.4186 -0.7235\n' +
        'vn 0.7015 0.4740 -0.5322\n' +
        'vn 0.7967 0.2425 -0.5536\n' +
        'vn 0.7015 -0.4740 -0.5322\n' +
        'vn 0.5489 -0.4186 -0.7235\n' +
        'vn 0.5866 -0.1425 -0.7973\n' +
        'vn 0.7967 -0.2425 -0.5536\n' +
        'vn 0.1408 -0.9444 -0.2971\n' +
        'vn 0.4848 -0.4844 -0.7282\n' +
        'vn 0.9507 -0.0002 -0.3100\n' +
        'vn 0.9917 -0.0973 -0.0838\n' +
        'vn 0.9507 0.0002 -0.3100\n' +
        'vn 0.4848 0.4844 -0.7282\n' +
        'vn 0.1408 0.9444 -0.2971\n' +
        'vn 0.9917 0.0973 -0.0838\n' +
        'vn -0.0788 -0.8836 0.4616\n' +
        'vn -0.0735 -0.9887 0.1305\n' +
        'vn 0.9962 -0.0764 0.0426\n' +
        'vn 0.9854 -0.0004 0.1704\n' +
        'vn 0.9962 0.0764 0.0426\n' +
        'vn -0.0734 0.9887 0.1305\n' +
        'vn -0.0788 0.8836 0.4616\n' +
        'vn 0.9854 0.0004 0.1704\n' +
        'vn 0.2080 -0.3238 0.9230\n' +
        'vn 0.0599 -0.6448 0.7620\n' +
        'vn 0.9319 0.0938 0.3504\n' +
        'vn 0.8130 0.2111 0.5426\n' +
        'vn 0.9319 -0.0938 0.3504\n' +
        'vn 0.0599 0.6448 0.7620\n' +
        'vn 0.2080 0.3238 0.9230\n' +
        'vn 0.8130 -0.2111 0.5426\n' +
        'vn 0.3221 0.1031 0.9411\n' +
        'vn 0.2988 -0.0170 0.9542\n' +
        'vn 0.6707 0.3299 0.6644\n' +
        'vn 0.5754 0.2617 0.7749\n' +
        'vn 0.6707 -0.3299 0.6644\n' +
        'vn 0.2988 0.0170 0.9542\n' +
        'vn 0.3221 -0.1031 0.9411\n' +
        'vn 0.5754 -0.2617 0.7749\n' +
        'vn 0.9449 0.2798 0.1697\n' +
        'vn 0.9542 0.2673 0.1343\n' +
        'vn 0.9769 0.1537 0.1482\n' +
        'vn 0.9811 0.1855 0.0547\n' +
        'vn 0.9769 -0.1537 0.1482\n' +
        'vn 0.9542 -0.2673 0.1343\n' +
        'vn 0.9449 -0.2798 0.1697\n' +
        'vn 0.9811 -0.1855 0.0547\n' +
        'vn 0.9649 0.2602 0.0351\n' +
        'vn 0.9484 0.2969 0.1113\n' +
        'vn 0.9139 0.4049 0.0281\n' +
        'vn 0.9430 0.3324 0.0130\n' +
        'vn 0.9139 -0.4049 0.0281\n' +
        'vn 0.9484 -0.2969 0.1113\n' +
        'vn 0.9649 -0.2602 0.0351\n' +
        'vn 0.9430 -0.3325 0.0130\n' +
        'vn 0.9346 0.3555 -0.0073\n' +
        'vn 0.9102 0.4114 -0.0483\n' +
        'vn 0.9209 0.3771 -0.0984\n' +
        'vn 0.9435 0.3311 -0.0079\n' +
        'vn 0.9209 -0.3771 -0.0984\n' +
        'vn 0.9102 -0.4114 -0.0483\n' +
        'vn 0.9346 -0.3555 -0.0073\n' +
        'vn 0.9435 -0.3311 -0.0079\n' +
        'vn 0.9546 0.2956 0.0378\n' +
        'vn 0.9269 0.3544 -0.1233\n' +
        'vn 0.9101 0.4143 -0.0083\n' +
        'vn 0.9168 0.3604 0.1720\n' +
        'vn 0.9101 -0.4143 -0.0083\n' +
        'vn 0.9269 -0.3544 -0.1233\n' +
        'vn 0.9546 -0.2956 0.0378\n' +
        'vn 0.9168 -0.3604 0.1720\n' +
        'vn 0.8671 0.4771 0.1435\n' +
        'vn 0.8622 0.5065 0.0007\n' +
        'vn 0.9290 0.3560 0.1014\n' +
        'vn 0.8950 0.3599 0.2634\n' +
        'vn 0.9290 -0.3560 0.1014\n' +
        'vn 0.8622 -0.5065 0.0007\n' +
        'vn 0.8671 -0.4771 0.1435\n' +
        'vn 0.8950 -0.3599 0.2634\n' +
        'vn 0.8599 0.4753 -0.1864\n' +
        'vn 0.9262 0.3746 -0.0419\n' +
        'vn 0.9243 0.3816 -0.0042\n' +
        'vn 0.8525 0.5077 -0.1246\n' +
        'vn 0.9243 -0.3816 -0.0042\n' +
        'vn 0.9262 -0.3746 -0.0419\n' +
        'vn 0.8599 -0.4753 -0.1864\n' +
        'vn 0.8525 -0.5077 -0.1246\n' +
        'vn 0.8854 0.4123 -0.2144\n' +
        'vn 0.9170 0.3302 -0.2236\n' +
        'vn 0.9691 0.2430 -0.0419\n' +
        'vn 0.9444 0.3251 -0.0497\n' +
        'vn 0.9691 -0.2430 -0.0419\n' +
        'vn 0.9170 -0.3302 -0.2236\n' +
        'vn 0.8854 -0.4123 -0.2144\n' +
        'vn 0.9444 -0.3251 -0.0497\n' +
        'vn 0.9573 0.2333 0.1705\n' +
        'vn 0.9854 0.1698 -0.0099\n' +
        'vn 0.9387 0.2759 -0.2066\n' +
        'vn 0.9461 0.3192 -0.0542\n' +
        'vn 0.9387 -0.2759 -0.2066\n' +
        'vn 0.9854 -0.1698 -0.0099\n' +
        'vn 0.9573 -0.2333 0.1705\n' +
        'vn 0.9461 -0.3192 -0.0542\n' +
        'vn 0.6808 -0.1674 0.7130\n' +
        'vn 0.7763 -0.0072 0.6304\n' +
        'vn 0.9316 0.0516 0.3597\n' +
        'vn 0.9512 0.0764 0.2989\n' +
        'vn 0.9316 -0.0516 0.3597\n' +
        'vn 0.7763 0.0072 0.6304\n' +
        'vn 0.6808 0.1674 0.7130\n' +
        'vn 0.9512 -0.0764 0.2989\n' +
        'vn 0.8320 0.5356 0.1448\n' +
        'vn 0.8620 0.5062 0.0270\n' +
        'vn 0.9067 0.3860 0.1700\n' +
        'vn 0.8433 0.4303 0.3221\n' +
        'vn 0.9067 -0.3860 0.1700\n' +
        'vn 0.8620 -0.5062 0.0270\n' +
        'vn 0.8320 -0.5356 0.1448\n' +
        'vn 0.8433 -0.4303 0.3221\n' +
        'vn 0.8969 0.4286 -0.1091\n' +
        'vn 0.8873 0.4333 -0.1582\n' +
        'vn 0.8785 0.4705 -0.0830\n' +
        'vn 0.8828 0.4698 0.0002\n' +
        'vn 0.8785 -0.4705 -0.0830\n' +
        'vn 0.8873 -0.4333 -0.1582\n' +
        'vn 0.8969 -0.4286 -0.1091\n' +
        'vn 0.8828 -0.4698 0.0002\n' +
        'vn 0.8635 0.5004 -0.0624\n' +
        'vn 0.8567 0.5045 -0.1076\n' +
        'vn 0.8768 0.4422 -0.1891\n' +
        'vn 0.8820 0.4508 -0.1371\n' +
        'vn 0.8768 -0.4422 -0.1891\n' +
        'vn 0.8567 -0.5045 -0.1076\n' +
        'vn 0.8636 -0.5004 -0.0624\n' +
        'vn 0.8820 -0.4508 -0.1371\n' +
        'vn 0.8653 0.4410 0.2381\n' +
        'vn 0.8534 0.4507 0.2617\n' +
        'vn 0.8506 0.5138 0.1115\n' +
        'vn 0.8601 0.4979 0.1107\n' +
        'vn 0.8506 -0.5138 0.1115\n' +
        'vn 0.8534 -0.4507 0.2617\n' +
        'vn 0.8653 -0.4410 0.2381\n' +
        'vn 0.8601 -0.4979 0.1107\n' +
        'vn 0.8711 0.4517 0.1928\n' +
        'vn 0.8492 0.3926 0.3532\n' +
        'vn 0.8830 0.3918 0.2583\n' +
        'vn 0.8830 -0.3918 0.2583\n' +
        'vn 0.8492 -0.3926 0.3532\n' +
        'vn 0.8711 -0.4517 0.1928\n' +
        'vn -0.1017 0.2008 -0.9743\n' +
        'vn -0.1245 0.0146 -0.9921\n' +
        'vn -0.7372 -0.2755 -0.6169\n' +
        'vn -0.7726 -0.2538 -0.5820\n' +
        'vn -0.7372 0.2755 -0.6169\n' +
        'vn -0.1245 -0.0146 -0.9921\n' +
        'vn -0.1017 -0.2008 -0.9743\n' +
        'vn -0.7726 0.2538 -0.5820\n' +
        'vn 0.1181 0.6783 -0.7252\n' +
        'vn -0.0522 0.4237 -0.9043\n' +
        'vn -0.8217 -0.0462 -0.5681\n' +
        'vn -0.7893 0.2592 -0.5567\n' +
        'vn -0.8217 0.0462 -0.5681\n' +
        'vn -0.0522 -0.4237 -0.9043\n' +
        'vn 0.1181 -0.6783 -0.7252\n' +
        'vn -0.7893 -0.2592 -0.5567\n' +
        'vn 0.4419 0.8932 -0.0827\n' +
        'vn 0.3541 0.8431 -0.4048\n' +
        'vn -0.4770 0.7545 -0.4509\n' +
        'vn -0.0547 0.9949 -0.0845\n' +
        'vn -0.4770 -0.7545 -0.4509\n' +
        'vn 0.3541 -0.8431 -0.4048\n' +
        'vn 0.4419 -0.8932 -0.0827\n' +
        'vn -0.0547 -0.9949 -0.0845\n' +
        'vn 0.0465 0.6621 0.7480\n' +
        'vn 0.3299 0.8922 0.3085\n' +
        'vn -0.2049 0.9197 0.3348\n' +
        'vn -0.7232 0.3805 0.5764\n' +
        'vn -0.2049 -0.9197 0.3348\n' +
        'vn 0.3299 -0.8922 0.3085\n' +
        'vn 0.0465 -0.6621 0.7480\n' +
        'vn -0.7232 -0.3805 0.5764\n' +
        'vn -0.2447 -0.2730 0.9304\n' +
        'vn -0.2192 0.0718 0.9730\n' +
        'vn -0.8415 -0.1804 0.5092\n' +
        'vn -0.7874 -0.3970 0.4716\n' +
        'vn -0.8415 0.1804 0.5092\n' +
        'vn -0.2192 -0.0718 0.9730\n' +
        'vn -0.2447 0.2730 0.9304\n' +
        'vn -0.7874 0.3970 0.4716\n' +
        'vn -0.1026 -0.5203 0.8478\n' +
        'vn -0.1888 -0.4101 0.8923\n' +
        'vn -0.7237 -0.5022 0.4732\n' +
        'vn -0.6777 -0.5231 0.5168\n' +
        'vn -0.7237 0.5022 0.4732\n' +
        'vn -0.1888 0.4101 0.8923\n' +
        'vn -0.1026 0.5203 0.8478\n' +
        'vn -0.6777 0.5231 0.5168\n' +
        'vn -0.8906 -0.4461 0.0883\n' +
        'vn -0.9059 -0.4031 -0.1301\n' +
        'vn -0.9267 -0.3417 -0.1564\n' +
        'vn -0.9183 -0.3837 0.0977\n' +
        'vn -0.9267 0.3417 -0.1564\n' +
        'vn -0.9059 0.4031 -0.1301\n' +
        'vn -0.8906 0.4461 0.0883\n' +
        'vn -0.9183 0.3837 0.0977\n' +
        'vn -0.9375 -0.3379 0.0835\n' +
        'vn -0.9760 -0.1997 0.0870\n' +
        'vn -0.9859 -0.1000 -0.1344\n' +
        'vn -0.9561 -0.2636 -0.1281\n' +
        'vn -0.9859 0.1000 -0.1344\n' +
        'vn -0.9760 0.1997 0.0870\n' +
        'vn -0.9375 0.3379 0.0835\n' +
        'vn -0.9561 0.2636 -0.1281\n' +
        'vn -0.9894 0.0490 0.1369\n' +
        'vn -0.7325 0.6767 0.0742\n' +
        'vn -0.9742 0.1696 -0.1492\n' +
        'vn -0.9742 -0.1696 -0.1492\n' +
        'vn -0.7325 -0.6767 0.0742\n' +
        'vn -0.9894 -0.0490 0.1369\n' +
        'vn -0.6776 0.3957 0.6200\n' +
        'vn -0.1204 0.0360 0.9921\n' +
        'vn -0.0191 -0.5976 0.8016\n' +
        'vn -0.6552 -0.4122 0.6331\n' +
        'vn -0.0191 0.5976 0.8016\n' +
        'vn -0.1204 -0.0360 0.9921\n' +
        'vn -0.6776 -0.3957 0.6200\n' +
        'vn -0.6552 0.4122 0.6331\n' +
        'vn -0.8497 0.5233 -0.0640\n' +
        'vn -0.9961 0.0682 0.0555\n' +
        'vn -0.9609 0.0762 -0.2663\n' +
        'vn -0.8316 0.4018 -0.3834\n' +
        'vn -0.9609 -0.0762 -0.2663\n' +
        'vn -0.9961 -0.0682 0.0555\n' +
        'vn -0.8497 -0.5233 -0.0640\n' +
        'vn -0.8316 -0.4018 -0.3834\n' +
        'vn -0.2244 -0.1127 -0.9680\n' +
        'vn -0.6504 0.0934 -0.7538\n' +
        'vn -0.7118 -0.0967 -0.6957\n' +
        'vn -0.1794 -0.1248 -0.9758\n' +
        'vn -0.7118 0.0967 -0.6957\n' +
        'vn -0.6504 -0.0934 -0.7538\n' +
        'vn -0.2244 0.1127 -0.9680\n' +
        'vn -0.1794 0.1248 -0.9758\n' +
        'vt 0.870030 0.588378\n' +
        'vt 0.867419 0.822754\n' +
        'vt 0.862604 0.563786\n' +
        'vt 0.858909 0.846992\n' +
        'vt 0.853018 0.521562\n' +
        'vt 0.847458 0.888748\n' +
        'vt 0.798481 0.569535\n' +
        'vt 0.795104 0.838402\n' +
        'vt 0.833214 0.591819\n' +
        'vt 0.830792 0.817682\n' +
        'vt 0.853983 0.603992\n' +
        'vt 0.852082 0.806443\n' +
        'vt 0.853339 0.625762\n' +
        'vt 0.852404 0.784665\n' +
        'vt 0.831397 0.632598\n' +
        'vt 0.830788 0.776862\n' +
        'vt 0.791018 0.645443\n' +
        'vt 0.791018 0.762238\n' +
        'vt 0.842358 0.702491\n' +
        'vt 0.844839 0.707525\n' +
        'vt 0.858085 0.663593\n' +
        'vt 0.858824 0.747083\n' +
        'vt 0.867752 0.642278\n' +
        'vt 0.867536 0.768806\n' +
        'vt 0.890327 0.642559\n' +
        'vt 0.890101 0.769527\n' +
        'vt 0.899331 0.663258\n' +
        'vt 0.900015 0.749248\n' +
        'vt 0.918898 0.699697\n' +
        'vt 0.921180 0.713713\n' +
        'vt 0.968392 0.645333\n' +
        'vt 0.968213 0.770220\n' +
        'vt 0.928547 0.634539\n' +
        'vt 0.927927 0.779235\n' +
        'vt 0.906442 0.627606\n' +
        'vt 0.905537 0.785180\n' +
        'vt 0.907144 0.605091\n' +
        'vt 0.905239 0.807704\n' +
        'vt 0.929700 0.593878\n' +
        'vt 0.927275 0.819908\n' +
        'vt 0.968392 0.573812\n' +
        'vt 0.965038 0.841671\n' +
        'vt 0.920166 0.524546\n' +
        'vt 0.914672 0.888748\n' +
        'vt 0.902530 0.564230\n' +
        'vt 0.898815 0.848320\n' +
        'vt 0.891866 0.588564\n' +
        'vt 0.889242 0.823537\n' +
        'vt 0.887736 0.598020\n' +
        'vt 0.885535 0.813907\n' +
        'vt 0.897747 0.609290\n' +
        'vt 0.896037 0.803092\n' +
        'vt 0.896611 0.624069\n' +
        'vt 0.895558 0.788278\n' +
        'vt 0.886375 0.633061\n' +
        'vt 0.885732 0.778841\n' +
        'vt 0.872419 0.632307\n' +
        'vt 0.871755 0.778974\n' +
        'vt 0.863131 0.622588\n' +
        'vt 0.862045 0.788271\n' +
        'vt 0.879691 0.616207\n' +
        'vt 0.878306 0.795381\n' +
        'vt 0.863258 0.609033\n' +
        'vt 0.861571 0.801818\n' +
        'vt 0.873321 0.598226\n' +
        'vt 0.871144 0.813061\n' +
        'vt 0.522000 0.388854\n' +
        'vt 0.521048 0.341672\n' +
        'vt 0.518927 0.097638\n' +
        'vt 0.519000 0.161350\n' +
        'vt 0.518956 0.187619\n' +
        'vt 0.518925 0.083725\n' +
        'vt 0.523031 0.433628\n' +
        'vt 0.819845 0.468071\n' +
        'vt 0.215894 0.503605\n' +
        'vt 0.845499 0.449967\n' +
        'vt 0.185281 0.484099\n' +
        'vt 0.999856 0.254640\n' +
        'vt 0.000144 0.259113\n' +
        'vt 0.994525 0.167705\n' +
        'vt 0.011829 0.155367\n' +
        'vt 0.945900 0.079569\n' +
        'vt 0.078961 0.060719\n' +
        'vt 0.805584 0.010786\n' +
        'vt 0.232648 0.003484\n' +
        'vt 0.606717 0.173514\n' +
        'vt 0.430834 0.174134\n' +
        'vt 0.584669 0.109759\n' +
        'vt 0.452964 0.109753\n' +
        'vt 0.569984 0.081205\n' +
        'vt 0.467794 0.081119\n' +
        'vt 0.558277 0.064830\n' +
        'vt 0.479585 0.064749\n' +
        'vt 0.550630 0.058404\n' +
        'vt 0.487254 0.058341\n' +
        'vt 0.538932 0.053142\n' +
        'vt 0.498948 0.053107\n' +
        'vt 0.518927 0.049466\n' +
        'vt 0.643325 0.203196\n' +
        'vt 0.393824 0.204661\n' +
        'vt 0.678421 0.234190\n' +
        'vt 0.358185 0.237010\n' +
        'vt 0.706155 0.268300\n' +
        'vt 0.330224 0.273117\n' +
        'vt 0.707716 0.306939\n' +
        'vt 0.330119 0.313546\n' +
        'vt 0.694628 0.335697\n' +
        'vt 0.344965 0.342624\n' +
        'vt 0.663792 0.369910\n' +
        'vt 0.378142 0.376063\n' +
        'vt 0.630772 0.392967\n' +
        'vt 0.412793 0.397883\n' +
        'vt 0.600523 0.398114\n' +
        'vt 0.443592 0.401663\n' +
        'vt 0.557300 0.392517\n' +
        'vt 0.486806 0.394072\n' +
        'vt 0.576225 0.338715\n' +
        'vt 0.465581 0.340746\n' +
        'vt 0.557863 0.319011\n' +
        'vt 0.483365 0.320242\n' +
        'vt 0.576079 0.253063\n' +
        'vt 0.463102 0.254240\n' +
        'vt 0.612128 0.245986\n' +
        'vt 0.426389 0.247827\n' +
        'vt 0.641666 0.256631\n' +
        'vt 0.396519 0.259390\n' +
        'vt 0.662428 0.278197\n' +
        'vt 0.375833 0.282102\n' +
        'vt 0.667848 0.298912\n' +
        'vt 0.370958 0.303610\n' +
        'vt 0.659448 0.315356\n' +
        'vt 0.380180 0.320164\n' +
        'vt 0.636056 0.333395\n' +
        'vt 0.404781 0.337637\n' +
        'vt 0.598707 0.346763\n' +
        'vt 0.443209 0.349734\n' +
        'vt 0.518925 0.086813\n' +
        'vt 0.531314 0.084364\n' +
        'vt 0.506536 0.084348\n' +
        'vt 0.531900 0.073754\n' +
        'vt 0.505958 0.073734\n' +
        'vt 0.526631 0.068594\n' +
        'vt 0.511228 0.068581\n' +
        'vt 0.518929 0.067217\n' +
        'vt 0.518870 0.192196\n' +
        'vt 0.519447 0.200524\n' +
        'vt 0.541412 0.193460\n' +
        'vt 0.497011 0.193556\n' +
        'vt 0.546848 0.174229\n' +
        'vt 0.491210 0.174349\n' +
        'vt 0.538444 0.155781\n' +
        'vt 0.499510 0.155839\n' +
        'vt 0.620982 0.227195\n' +
        'vt 0.416967 0.228884\n' +
        'vt 0.660032 0.250401\n' +
        'vt 0.377513 0.253407\n' +
        'vt 0.682242 0.277954\n' +
        'vt 0.355371 0.282451\n' +
        'vt 0.685701 0.306143\n' +
        'vt 0.352843 0.311772\n' +
        'vt 0.673551 0.326478\n' +
        'vt 0.366172 0.332164\n' +
        'vt 0.644354 0.353229\n' +
        'vt 0.397170 0.358172\n' +
        'vt 0.620111 0.370606\n' +
        'vt 0.422568 0.374743\n' +
        'vt 0.597676 0.372592\n' +
        'vt 0.445326 0.375785\n' +
        'vt 0.562472 0.360194\n' +
        'vt 0.480243 0.361830\n' +
        'vt 0.562261 0.209532\n' +
        'vt 0.476187 0.210070\n' +
        'vt 0.555906 0.119138\n' +
        'vt 0.481895 0.119167\n' +
        'vt 0.549116 0.088653\n' +
        'vt 0.488718 0.088625\n' +
        'vt 0.545254 0.073767\n' +
        'vt 0.492603 0.073725\n' +
        'vt 0.541665 0.065699\n' +
        'vt 0.496204 0.065659\n' +
        'vt 0.533709 0.061936\n' +
        'vt 0.504158 0.061911\n' +
        'vt 0.518928 0.060267\n' +
        'vt 0.519740 0.246803\n' +
        'vt 0.520283 0.294459\n' +
        'vt 0.616301 0.344493\n' +
        'vt 0.425312 0.348127\n' +
        'vt 0.559183 0.269993\n' +
        'vt 0.480589 0.270949\n' +
        'vt 0.553909 0.292942\n' +
        'vt 0.486519 0.293897\n' +
        'vt 0.532882 0.095518\n' +
        'vt 0.504966 0.095508\n' +
        'vt 0.534438 0.125582\n' +
        'vt 0.503434 0.125599\n' +
        'vt 0.518944 0.126582\n' +
        'vt 0.518977 0.150942\n' +
        'vt 0.533001 0.166572\n' +
        'vt 0.505014 0.166616\n' +
        'vt 0.538097 0.176161\n' +
        'vt 0.499967 0.176220\n' +
        'vt 0.536221 0.186667\n' +
        'vt 0.501933 0.186664\n' +
        'vt 0.527566 0.190463\n' +
        'vt 0.510592 0.190387\n' +
        'vt 0.519068 0.179757\n' +
        'vt 0.527890 0.185349\n' +
        'vt 0.510174 0.185302\n' +
        'vt 0.532635 0.183653\n' +
        'vt 0.505436 0.183644\n' +
        'vt 0.531715 0.177200\n' +
        'vt 0.506355 0.177233\n' +
        'vt 0.529456 0.170655\n' +
        'vt 0.508586 0.170688\n' +
        'vt 0.519024 0.168442\n' +
        'vt 0.594406 0.134087\n' +
        'vt 0.443132 0.134237\n' +
        'vt 0.564380 0.168228\n' +
        'vt 0.473555 0.168461\n' +
        'vt 0.561724 0.146447\n' +
        'vt 0.476096 0.146568\n' +
        'vt 0.597971 0.151887\n' +
        'vt 0.439580 0.152198\n' +
        'vt 0.518929 0.070334\n' +
        'vt 0.523705 0.071560\n' +
        'vt 0.514152 0.071552\n' +
        'vt 0.527773 0.076168\n' +
        'vt 0.510082 0.076156\n' +
        'vt 0.526960 0.082800\n' +
        'vt 0.510890 0.082790\n' +
        'vt 0.518926 0.079464\n' +
        'vt 0.523850 0.079242\n' +
        'vt 0.514003 0.079236\n' +
        'vt 0.524794 0.076834\n' +
        'vt 0.513061 0.076826\n' +
        'vt 0.522261 0.075175\n' +
        'vt 0.515596 0.075171\n' +
        'vt 0.518928 0.074552\n' +
        'vt 0.569194 0.293361\n' +
        'vt 0.471148 0.294767\n' +
        'vt 0.572378 0.277916\n' +
        'vt 0.467491 0.279257\n' +
        'vt 0.614703 0.331776\n' +
        'vt 0.426416 0.335172\n' +
        'vt 0.600471 0.333348\n' +
        'vt 0.440897 0.336238\n' +
        'vt 0.631003 0.323613\n' +
        'vt 0.409537 0.327484\n' +
        'vt 0.649955 0.310358\n' +
        'vt 0.389715 0.314674\n' +
        'vt 0.655976 0.296670\n' +
        'vt 0.383076 0.300866\n' +
        'vt 0.651315 0.280039\n' +
        'vt 0.387310 0.283651\n' +
        'vt 0.633228 0.263757\n' +
        'vt 0.405337 0.266471\n' +
        'vt 0.610393 0.257673\n' +
        'vt 0.428436 0.259678\n' +
        'vt 0.584080 0.265954\n' +
        'vt 0.455329 0.267445\n' +
        'vt 0.573246 0.311528\n' +
        'vt 0.467637 0.313233\n' +
        'vt 0.585155 0.326924\n' +
        'vt 0.456147 0.329185\n' +
        'vt 0.590644 0.321516\n' +
        'vt 0.450408 0.323919\n' +
        'vt 0.579548 0.309340\n' +
        'vt 0.461204 0.311233\n' +
        'vt 0.585166 0.270991\n' +
        'vt 0.454369 0.272583\n' +
        'vt 0.612641 0.261560\n' +
        'vt 0.426254 0.263693\n' +
        'vt 0.629829 0.267263\n' +
        'vt 0.408893 0.269959\n' +
        'vt 0.647785 0.283486\n' +
        'vt 0.391040 0.287071\n' +
        'vt 0.649541 0.296225\n' +
        'vt 0.389662 0.300183\n' +
        'vt 0.646248 0.306421\n' +
        'vt 0.393381 0.310510\n' +
        'vt 0.626851 0.320513\n' +
        'vt 0.413648 0.324175\n' +
        'vt 0.601799 0.328453\n' +
        'vt 0.439372 0.331331\n' +
        'vt 0.613335 0.327083\n' +
        'vt 0.427623 0.330358\n' +
        'vt 0.578124 0.281900\n' +
        'vt 0.461798 0.283441\n' +
        'vt 0.577524 0.293776\n' +
        'vt 0.462754 0.295432\n' +
        'vt 0.553209 0.433063\n' +
        'vt 0.815858 0.445381\n' +
        'vt 0.492809 0.434538\n' +
        'vt 0.219260 0.477186\n' +
        'vt 0.609819 0.431516\n' +
        'vt 0.770572 0.444261\n' +
        'vt 0.435860 0.435740\n' +
        'vt 0.271364 0.473316\n' +
        'vt 0.648174 0.419316\n' +
        'vt 0.755700 0.418603\n' +
        'vt 0.396518 0.425416\n' +
        'vt 0.287033 0.442912\n' +
        'vt 0.692106 0.388274\n' +
        'vt 0.770185 0.379538\n' +
        'vt 0.350292 0.396229\n' +
        'vt 0.268122 0.398737\n' +
        'vt 0.726332 0.341754\n' +
        'vt 0.749542 0.334683\n' +
        'vt 0.312756 0.350588\n' +
        'vt 0.288183 0.346496\n' +
        'vt 0.735879 0.312112\n' +
        'vt 0.301067 0.320593\n' +
        'vt 0.731732 0.256960\n' +
        'vt 0.303021 0.261732\n' +
        'vt 0.704345 0.216768\n' +
        'vt 0.330844 0.219066\n' +
        'vt 0.661997 0.182194\n' +
        'vt 0.374475 0.183225\n' +
        'vt 0.911671 0.402429\n' +
        'vt 0.106400 0.432652\n' +
        'vt 0.962901 0.344752\n' +
        'vt 0.043968 0.367038\n' +
        'vt 0.891780 0.036916\n' +
        'vt 0.142277 0.021467\n' +
        'vt 0.672384 0.022201\n' +
        'vt 0.365979 0.020991\n' +
        'vt 0.518922 0.024886\n' +
        'vt 0.567460 0.000144\n' +
        'vt 0.470636 0.000144\n' +
        'vt 0.626908 0.015608\n' +
        'vt 0.411318 0.015131\n' +
        'vt 0.649444 0.022378\n' +
        'vt 0.388827 0.021586\n' +
        'vt 0.775601 0.240649\n' +
        'vt 0.255850 0.244822\n' +
        'vt 0.807441 0.229424\n' +
        'vt 0.221295 0.233026\n' +
        'vt 0.842355 0.195160\n' +
        'vt 0.620420 0.565675\n' +
        'vt 0.176788 0.196179\n' +
        'vt 0.145041 0.562595\n' +
        'vt 0.914482 0.182608\n' +
        'vt 0.102735 0.178481\n' +
        'vt 0.757521 0.190511\n' +
        'vt 0.274623 0.191243\n' +
        'vt 0.785486 0.152330\n' +
        'vt 0.391039 0.611891\n' +
        'vt 0.245969 0.151002\n' +
        'vt 0.369913 0.610196\n' +
        'vt 0.837382 0.156361\n' +
        'vt 0.498072 0.552315\n' +
        'vt 0.196622 0.155241\n' +
        'vt 0.264218 0.550140\n' +
        'vt 0.890415 0.123857\n' +
        'vt 0.135898 0.114680\n' +
        'vt 0.623168 0.102506\n' +
        'vt 0.414200 0.102306\n' +
        'vt 0.651276 0.069444\n' +
        'vt 0.386183 0.068753\n' +
        'vt 0.575664 0.057224\n' +
        'vt 0.462196 0.057073\n' +
        'vt 0.603287 0.075214\n' +
        'vt 0.434381 0.074971\n' +
        'vt 0.558344 0.052733\n' +
        'vt 0.479556 0.052645\n' +
        'vt 0.577887 0.035813\n' +
        'vt 0.460069 0.035651\n' +
        'vt 0.618571 0.049232\n' +
        'vt 0.419251 0.048811\n' +
        'vt 0.548657 0.041550\n' +
        'vt 0.489258 0.041490\n' +
        'vt 0.638348 0.126687\n' +
        'vt 0.398640 0.126669\n' +
        'vt 0.627238 0.151895\n' +
        'vt 0.409904 0.152326\n' +
        'vt 0.626085 0.165130\n' +
        'vt 0.411126 0.165771\n' +
        'vt 0.691720 0.082104\n' +
        'vt 0.344998 0.080731\n' +
        'vt 0.785165 0.079197\n' +
        'vt 0.249731 0.074555\n' +
        'vt 0.852414 0.095350\n' +
        'vt 0.179441 0.087122\n' +
        'vt 0.919781 0.250393\n' +
        'vt 0.094028 0.256004\n' +
        'vt 0.900259 0.301403\n' +
        'vt 0.116648 0.315086\n' +
        'vt 0.862833 0.339954\n' +
        'vt 0.160617 0.358419\n' +
        'vt 0.808408 0.367445\n' +
        'vt 0.223795 0.387323\n' +
        'vt 0.775396 0.290931\n' +
        'vt 0.257300 0.299594\n' +
        'vt 0.789894 0.319390\n' +
        'vt 0.242397 0.331861\n' +
        'vt 0.838944 0.297106\n' +
        'vt 0.186723 0.308849\n' +
        'vt 0.816518 0.272015\n' +
        'vt 0.211626 0.280144\n' +
        'vt 0.844835 0.250500\n' +
        'vt 0.179686 0.256768\n' +
        'vt 0.869948 0.269424\n' +
        'vt 0.151188 0.278189\n' +
        'vt 0.882625 0.234204\n' +
        'vt 0.136353 0.238288\n' +
        'vt 0.858623 0.227701\n' +
        'vt 0.162853 0.231387\n' +
        'vt 0.874586 0.186701\n' +
        'vt 0.146523 0.185305\n' +
        'vt 0.851624 0.137928\n' +
        'vt 0.177710 0.133044\n' +
        'vt 0.391747 0.862097\n' +
        'vt 0.829287 0.219562\n' +
        'vt 0.363377 0.861308\n' +
        'vt 0.199067 0.222464\n' +
        'vt 0.051216 0.522659\n' +
        'vt 0.711304 0.140850\n' +
        'vt 0.323756 0.140459\n' +
        'vt 0.786328 0.123629\n' +
        'vt 0.246719 0.120879\n' +
        'vt 0.432388 0.894943\n' +
        'vt 0.740843 0.572428\n' +
        'vt 0.834578 0.206879\n' +
        'vt 0.321637 0.893225\n' +
        'vt 0.033664 0.564403\n' +
        'vt 0.449485 0.657000\n' +
        'vt 0.310643 0.654046\n' +
        'vt 0.509841 0.697759\n' +
        'vt 0.249234 0.693240\n' +
        'vt 0.563906 0.739644\n' +
        'vt 0.193912 0.733664\n' +
        'vt 0.619962 0.791615\n' +
        'vt 0.136063 0.784093\n' +
        'vt 0.604825 0.879946\n' +
        'vt 0.707492 0.759884\n' +
        'vt 0.148729 0.873349\n' +
        'vt 0.049526 0.748824\n' +
        'vt 0.506166 0.904851\n' +
        'vt 0.745511 0.652100\n' +
        'vt 0.247207 0.901159\n' +
        'vt 0.019409 0.639749\n' +
        'vt 0.499539 0.874122\n' +
        'vt 0.254720 0.870450\n' +
        'vt 0.564202 0.850664\n' +
        'vt 0.190405 0.845065\n' +
        'vt 0.580250 0.795789\n' +
        'vt 0.175863 0.789490\n' +
        'vt 0.548885 0.748691\n' +
        'vt 0.208705 0.743163\n' +
        'vt 0.500162 0.712902\n' +
        'vt 0.258509 0.708654\n' +
        'vt 0.444156 0.685466\n' +
        'vt 0.315307 0.682602\n' +
        'vt 0.443966 0.866254\n' +
        'vt 0.310781 0.864072\n' +
        'vt 0.459943 0.839570\n' +
        'vt 0.295454 0.836826\n' +
        'vt 0.456395 0.706675\n' +
        'vt 0.302521 0.703549\n' +
        'vt 0.502534 0.728973\n' +
        'vt 0.255704 0.724688\n' +
        'vt 0.541163 0.756823\n' +
        'vt 0.216222 0.751532\n' +
        'vt 0.562502 0.789894\n' +
        'vt 0.193863 0.784084\n' +
        'vt 0.550068 0.825831\n' +
        'vt 0.205318 0.820519\n' +
        'vt 0.503419 0.844017\n' +
        'vt 0.251660 0.840096\n' +
        'vt 0.401605 0.841460\n' +
        'vt 0.825107 0.209762\n' +
        'vt 0.354026 0.840297\n' +
        'vt 0.199767 0.214827\n' +
        'vt 0.416647 0.784180\n' +
        'vt 0.340415 0.782343\n' +
        'vt 0.413477 0.749613\n' +
        'vt 0.344485 0.747713\n' +
        'vt 0.426439 0.741264\n' +
        'vt 0.331688 0.739001\n' +
        'vt 0.427637 0.727671\n' +
        'vt 0.330829 0.725330\n' +
        'vt 0.432605 0.713610\n' +
        'vt 0.326197 0.711102\n' +
        'vt 0.788554 0.192382\n' +
        'vt 0.241315 0.192476\n' +
        'vt 0.394766 0.686125\n' +
        'vt 0.796021 0.176969\n' +
        'vt 0.364838 0.684445\n' +
        'vt 0.233625 0.175620\n' +
        'vt 0.384658 0.710299\n' +
        'vt 0.802192 0.184609\n' +
        'vt 0.374400 0.708969\n' +
        'vt 0.226485 0.183086\n' +
        'vt 0.384657 0.795423\n' +
        'vt 0.816266 0.203086\n' +
        'vt 0.372270 0.794472\n' +
        'vt 0.209828 0.206161\n' +
        'vt 0.431615 0.817632\n' +
        'vt 0.324502 0.815550\n' +
        'vt 0.451811 0.802386\n' +
        'vt 0.304625 0.799698\n' +
        'vt 0.444549 0.723066\n' +
        'vt 0.313980 0.720287\n' +
        'vt 0.445360 0.734927\n' +
        'vt 0.312864 0.732161\n' +
        'vt 0.437927 0.749013\n' +
        'vt 0.319962 0.746483\n' +
        'vt 0.427225 0.757716\n' +
        'vt 0.330479 0.755494\n' +
        'vt 0.436386 0.777602\n' +
        'vt 0.320766 0.775220\n' +
        'vt 0.511215 0.824963\n' +
        'vt 0.244360 0.820741\n' +
        'vt 0.541040 0.811919\n' +
        'vt 0.214780 0.806804\n' +
        'vt 0.546147 0.788922\n' +
        'vt 0.210310 0.783576\n' +
        'vt 0.531671 0.766931\n' +
        'vt 0.225460 0.761934\n' +
        'vt 0.501728 0.744462\n' +
        'vt 0.256098 0.740235\n' +
        'vt 0.462564 0.723199\n' +
        'vt 0.295912 0.719956\n' +
        'vt 0.476448 0.820892\n' +
        'vt 0.279386 0.817614\n' +
        'vt 0.454532 0.763737\n' +
        'vt 0.302918 0.760827\n' +
        'vt 0.465931 0.746865\n' +
        'vt 0.291922 0.743601\n' +
        'vt 0.488869 0.767274\n' +
        'vt 0.268377 0.763461\n' +
        'vt 0.473242 0.784433\n' +
        'vt 0.283593 0.781099\n' +
        'vt 0.493253 0.801362\n' +
        'vt 0.263049 0.797547\n' +
        'vt 0.507689 0.784426\n' +
        'vt 0.249030 0.780152\n' +
        'vt 0.522598 0.793066\n' +
        'vt 0.233828 0.788400\n' +
        'vt 0.517518 0.807560\n' +
        'vt 0.238518 0.803091\n' +
        'vt 0.662037 0.669246\n' +
        'vt 0.099330 0.661402\n' +
        'vt 0.650797 0.733264\n' +
        'vt 0.107361 0.724567\n' +
        'vt 0.620321 0.755014\n' +
        'vt 0.136930 0.747279\n' +
        'vt 0.590552 0.728580\n' +
        'vt 0.167610 0.721786\n' +
        'vt 0.556316 0.682330\n' +
        'vt 0.203366 0.676789\n' +
        'vt 0.514798 0.626547\n' +
        'vt 0.246506 0.622959\n' +
        'vt 0.834705 0.206959\n' +
        'vt 0.671403 0.592656\n' +
        'vt 0.116470 0.596802\n' +
        'vt 0.896347 0.578250\n' +
        'vt 0.881001 0.586218\n' +
        'vt 0.866682 0.578023\n' +
        'vt 0.882727 0.559995\n' +
        'vt 0.878844 0.851672\n' +
        'vt 0.863615 0.832949\n' +
        'vt 0.878283 0.825399\n' +
        'vt 0.893260 0.834040\n' +
        'vt 0.909840 0.547939\n' +
        'vt 0.858573 0.546708\n' +
        'vt 0.886592 0.523054\n' +
        'vt 0.881065 0.888748\n' +
        'vt 0.854123 0.863874\n' +
        'vt 0.905395 0.864920\n' +
        'vt 0.845255 0.575016\n' +
        'vt 0.819402 0.582969\n' +
        'vt 0.825750 0.545549\n' +
        'vt 0.821281 0.863575\n' +
        'vt 0.816601 0.825909\n' +
        'vt 0.842076 0.835003\n' +
        'vt 0.860527 0.594711\n' +
        'vt 0.845037 0.598894\n' +
        'vt 0.842917 0.811139\n' +
        'vt 0.858207 0.816005\n' +
        'vt 0.851581 0.614788\n' +
        'vt 0.844036 0.628645\n' +
        'vt 0.828470 0.611908\n' +
        'vt 0.826944 0.797402\n' +
        'vt 0.843238 0.781373\n' +
        'vt 0.850161 0.795550\n' +
        'vt 0.815815 0.637531\n' +
        'vt 0.794750 0.607489\n' +
        'vt 0.793061 0.800320\n' +
        'vt 0.815439 0.771243\n' +
        'vt 0.841710 0.650974\n' +
        'vt 0.852019 0.678441\n' +
        'vt 0.816688 0.673967\n' +
        'vt 0.817929 0.734882\n' +
        'vt 0.853423 0.731981\n' +
        'vt 0.841906 0.758962\n' +
        'vt 0.858924 0.635509\n' +
        'vt 0.863472 0.651419\n' +
        'vt 0.863666 0.759484\n' +
        'vt 0.858416 0.775176\n' +
        'vt 0.878900 0.644609\n' +
        'vt 0.893948 0.651418\n' +
        'vt 0.878518 0.667629\n' +
        'vt 0.879417 0.743958\n' +
        'vt 0.894112 0.760838\n' +
        'vt 0.878776 0.766972\n' +
        'vt 0.906773 0.677500\n' +
        'vt 0.880628 0.701094\n' +
        'vt 0.883010 0.710619\n' +
        'vt 0.908082 0.735350\n' +
        'vt 0.916779 0.651601\n' +
        'vt 0.944430 0.638750\n' +
        'vt 0.943645 0.672515\n' +
        'vt 0.944697 0.741967\n' +
        'vt 0.943982 0.775733\n' +
        'vt 0.916928 0.761668\n' +
        'vt 0.899928 0.636635\n' +
        'vt 0.915741 0.630680\n' +
        'vt 0.914963 0.782522\n' +
        'vt 0.899430 0.775872\n' +
        'vt 0.908961 0.616500\n' +
        'vt 0.916674 0.600453\n' +
        'vt 0.932989 0.614319\n' +
        'vt 0.931467 0.799633\n' +
        'vt 0.914553 0.812760\n' +
        'vt 0.907560 0.796387\n' +
        'vt 0.945268 0.585710\n' +
        'vt 0.968392 0.609573\n' +
        'vt 0.966626 0.805946\n' +
        'vt 0.942464 0.828758\n' +
        'vt 0.918960 0.576259\n' +
        'vt 0.944279 0.549179\n' +
        'vt 0.939855 0.865210\n' +
        'vt 0.915763 0.837033\n' +
        'vt 0.901063 0.595260\n' +
        'vt 0.898727 0.817256\n' +
        'vt 0.889516 0.593986\n' +
        'vt 0.901897 0.607554\n' +
        'vt 0.894036 0.602422\n' +
        'vt 0.892025 0.809789\n' +
        'vt 0.900106 0.805011\n' +
        'vt 0.887135 0.818016\n' +
        'vt 0.900979 0.625755\n' +
        'vt 0.898814 0.616899\n' +
        'vt 0.897441 0.795538\n' +
        'vt 0.899997 0.786788\n' +
        'vt 0.888172 0.637293\n' +
        'vt 0.892510 0.629816\n' +
        'vt 0.891716 0.782355\n' +
        'vt 0.887714 0.774693\n' +
        'vt 0.870394 0.636697\n' +
        'vt 0.879335 0.634158\n' +
        'vt 0.878747 0.777432\n' +
        'vt 0.869928 0.774499\n' +
        'vt 0.858836 0.624049\n' +
        'vt 0.866648 0.628442\n' +
        'vt 0.865819 0.782580\n' +
        'vt 0.857819 0.786621\n' +
        'vt 0.859189 0.606926\n' +
        'vt 0.861665 0.615920\n' +
        'vt 0.860285 0.794867\n' +
        'vt 0.857412 0.803743\n' +
        'vt 0.871904 0.593995\n' +
        'vt 0.867135 0.602587\n' +
        'vt 0.865157 0.808431\n' +
        'vt 0.869540 0.817225\n' +
        'vt 0.880515 0.596288\n' +
        'vt 0.878245 0.815317\n' +
        'vt 0.884844 0.604522\n' +
        'vt 0.875527 0.604704\n' +
        'vt 0.882935 0.807283\n' +
        'vt 0.873635 0.806688\n' +
        'vt 0.869125 0.611719\n' +
        'vt 0.867551 0.799396\n' +
        'vt 0.869080 0.620377\n' +
        'vt 0.867890 0.790744\n' +
        'vt 0.875045 0.626475\n' +
        'vt 0.874120 0.784917\n' +
        'vt 0.883862 0.627033\n' +
        'vt 0.882953 0.784751\n' +
        'vt 0.890426 0.621326\n' +
        'vt 0.889258 0.790744\n' +
        'vt 0.891241 0.611825\n' +
        'vt 0.889650 0.800271\n' +
        'vt 0.529631 0.050623\n' +
        'vt 0.536535 0.057879\n' +
        'vt 0.526890 0.060774\n' +
        'vt 0.518927 0.055691\n' +
        'vt 0.510970 0.060761\n' +
        'vt 0.501338 0.057849\n' +
        'vt 0.508233 0.050605\n' +
        'vt 0.545785 0.055839\n' +
        'vt 0.546344 0.061772\n' +
        'vt 0.538530 0.063428\n' +
        'vt 0.499341 0.063394\n' +
        'vt 0.491532 0.061722\n' +
        'vt 0.492101 0.055788\n' +
        'vt 0.554370 0.061003\n' +
        'vt 0.551211 0.068711\n' +
        'vt 0.543713 0.069216\n' +
        'vt 0.494151 0.069174\n' +
        'vt 0.486651 0.068653\n' +
        'vt 0.483508 0.060931\n' +
        'vt 0.563458 0.071240\n' +
        'vt 0.557931 0.084403\n' +
        'vt 0.546863 0.079495\n' +
        'vt 0.490985 0.079456\n' +
        'vt 0.479886 0.084355\n' +
        'vt 0.474372 0.071151\n' +
        'vt 0.577462 0.094907\n' +
        'vt 0.568996 0.113937\n' +
        'vt 0.552345 0.102867\n' +
        'vt 0.485469 0.102860\n' +
        'vt 0.468739 0.113956\n' +
        'vt 0.460245 0.094849\n' +
        'vt 0.588058 0.187766\n' +
        'vt 0.623047 0.187743\n' +
        'vt 0.631501 0.214704\n' +
        'vt 0.594357 0.218252\n' +
        'vt 0.443837 0.219371\n' +
        'vt 0.406048 0.216285\n' +
        'vt 0.414343 0.188719\n' +
        'vt 0.449840 0.188379\n' +
        'vt 0.661634 0.218648\n' +
        'vt 0.669352 0.243047\n' +
        'vt 0.642758 0.238051\n' +
        'vt 0.394962 0.240367\n' +
        'vt 0.367747 0.246009\n' +
        'vt 0.375257 0.220712\n' +
        'vt 0.694549 0.250377\n' +
        'vt 0.694356 0.273882\n' +
        'vt 0.673393 0.263696\n' +
        'vt 0.364084 0.267449\n' +
        'vt 0.342672 0.278583\n' +
        'vt 0.341787 0.254143\n' +
        'vt 0.709708 0.288269\n' +
        'vt 0.696214 0.307158\n' +
        'vt 0.686045 0.292850\n' +
        'vt 0.351971 0.298013\n' +
        'vt 0.342024 0.313257\n' +
        'vt 0.327263 0.294105\n' +
        'vt 0.703127 0.321595\n' +
        'vt 0.683130 0.331390\n' +
        'vt 0.681963 0.316290\n' +
        'vt 0.357107 0.322086\n' +
        'vt 0.356562 0.337640\n' +
        'vt 0.335540 0.328548\n' +
        'vt 0.680763 0.352705\n' +
        'vt 0.652699 0.362077\n' +
        'vt 0.659778 0.339674\n' +
        'vt 0.380834 0.345038\n' +
        'vt 0.389068 0.367559\n' +
        'vt 0.359988 0.359341\n' +
        'vt 0.646588 0.383692\n' +
        'vt 0.624369 0.382277\n' +
        'vt 0.631130 0.363764\n' +
        'vt 0.411090 0.368295\n' +
        'vt 0.418777 0.386757\n' +
        'vt 0.396305 0.389243\n' +
        'vt 0.616649 0.397524\n' +
        'vt 0.598554 0.385158\n' +
        'vt 0.609946 0.373678\n' +
        'vt 0.432989 0.377406\n' +
        'vt 0.444987 0.388508\n' +
        'vt 0.427300 0.401819\n' +
        'vt 0.579428 0.395873\n' +
        'vt 0.558704 0.375066\n' +
        'vt 0.581079 0.367396\n' +
        'vt 0.461826 0.369847\n' +
        'vt 0.484640 0.376617\n' +
        'vt 0.464721 0.398442\n' +
        'vt 0.538479 0.389775\n' +
        'vt 0.521556 0.367820\n' +
        'vt 0.544171 0.352749\n' +
        'vt 0.498315 0.353629\n' +
        'vt 0.505556 0.390492\n' +
        'vt 0.569092 0.348101\n' +
        'vt 0.587796 0.344190\n' +
        'vt 0.597887 0.358983\n' +
        'vt 0.444540 0.362048\n' +
        'vt 0.454123 0.346710\n' +
        'vt 0.473112 0.349926\n' +
        'vt 0.607884 0.346775\n' +
        'vt 0.617653 0.356946\n' +
        'vt 0.424468 0.360799\n' +
        'vt 0.433930 0.350106\n' +
        'vt 0.625350 0.340085\n' +
        'vt 0.639250 0.342857\n' +
        'vt 0.401924 0.347395\n' +
        'vt 0.415948 0.344013\n' +
        'vt 0.648512 0.324580\n' +
        'vt 0.665775 0.320611\n' +
        'vt 0.373904 0.325811\n' +
        'vt 0.391720 0.329150\n' +
        'vt 0.665696 0.307180\n' +
        'vt 0.676135 0.302669\n' +
        'vt 0.362572 0.307806\n' +
        'vt 0.373470 0.312032\n' +
        'vt 0.666991 0.289167\n' +
        'vt 0.671333 0.278721\n' +
        'vt 0.366673 0.282920\n' +
        'vt 0.371500 0.293541\n' +
        'vt 0.653522 0.266836\n' +
        'vt 0.650181 0.254219\n' +
        'vt 0.387724 0.257119\n' +
        'vt 0.384642 0.270171\n' +
        'vt 0.628187 0.249231\n' +
        'vt 0.614894 0.237670\n' +
        'vt 0.423379 0.239439\n' +
        'vt 0.410114 0.251496\n' +
        'vt 0.593202 0.247673\n' +
        'vt 0.568739 0.237235\n' +
        'vt 0.470159 0.238137\n' +
        'vt 0.445633 0.249136\n' +
        'vt 0.565207 0.260673\n' +
        'vt 0.543818 0.260934\n' +
        'vt 0.540998 0.229554\n' +
        'vt 0.498061 0.229884\n' +
        'vt 0.495841 0.261492\n' +
        'vt 0.474279 0.261694\n' +
        'vt 0.565631 0.330152\n' +
        'vt 0.543500 0.327712\n' +
        'vt 0.498076 0.328478\n' +
        'vt 0.475936 0.331730\n' +
        'vt 0.554259 0.306129\n' +
        'vt 0.520594 0.314908\n' +
        'vt 0.538779 0.293753\n' +
        'vt 0.501737 0.294276\n' +
        'vt 0.486569 0.307165\n' +
        'vt 0.520024 0.274574\n' +
        'vt 0.555605 0.280786\n' +
        'vt 0.484474 0.281720\n' +
        'vt 0.530010 0.065670\n' +
        'vt 0.522924 0.067551\n' +
        'vt 0.518928 0.064208\n' +
        'vt 0.514934 0.067544\n' +
        'vt 0.507853 0.065651\n' +
        'vt 0.536401 0.070107\n' +
        'vt 0.529745 0.070499\n' +
        'vt 0.508115 0.070482\n' +
        'vt 0.501461 0.070079\n' +
        'vt 0.538634 0.079398\n' +
        'vt 0.532695 0.078622\n' +
        'vt 0.505158 0.078602\n' +
        'vt 0.499218 0.079369\n' +
        'vt 0.544371 0.123175\n' +
        'vt 0.533457 0.109105\n' +
        'vt 0.540811 0.092572\n' +
        'vt 0.497031 0.092555\n' +
        'vt 0.504398 0.109107\n' +
        'vt 0.493474 0.123201\n' +
        'vt 0.532234 0.088149\n' +
        'vt 0.505613 0.088134\n' +
        'vt 0.536201 0.141054\n' +
        'vt 0.527931 0.152199\n' +
        'vt 0.518960 0.140483\n' +
        'vt 0.526211 0.126476\n' +
        'vt 0.511673 0.126484\n' +
        'vt 0.510024 0.152222\n' +
        'vt 0.501703 0.141090\n' +
        'vt 0.525683 0.097155\n' +
        'vt 0.518933 0.110934\n' +
        'vt 0.512170 0.097151\n' +
        'vt 0.518925 0.090132\n' +
        'vt 0.524936 0.086729\n' +
        'vt 0.512913 0.086722\n' +
        'vt 0.544497 0.165579\n' +
        'vt 0.541877 0.175314\n' +
        'vt 0.536621 0.171055\n' +
        'vt 0.534975 0.162976\n' +
        'vt 0.503019 0.163027\n' +
        'vt 0.501413 0.171114\n' +
        'vt 0.496189 0.175396\n' +
        'vt 0.493497 0.165677\n' +
        'vt 0.546062 0.184000\n' +
        'vt 0.538519 0.189136\n' +
        'vt 0.538068 0.181732\n' +
        'vt 0.500037 0.181769\n' +
        'vt 0.499767 0.189164\n' +
        'vt 0.492116 0.184122\n' +
        'vt 0.532432 0.200255\n' +
        'vt 0.525612 0.194282\n' +
        'vt 0.532342 0.189778\n' +
        'vt 0.505854 0.189727\n' +
        'vt 0.512801 0.194237\n' +
        'vt 0.506363 0.200300\n' +
        'vt 0.518962 0.193962\n' +
        'vt 0.518813 0.190611\n' +
        'vt 0.523084 0.188878\n' +
        'vt 0.514925 0.188826\n' +
        'vt 0.518991 0.157386\n' +
        'vt 0.526756 0.162909\n' +
        'vt 0.511248 0.162933\n' +
        'vt 0.519010 0.164691\n' +
        'vt 0.531195 0.169102\n' +
        'vt 0.525292 0.169323\n' +
        'vt 0.512753 0.169343\n' +
        'vt 0.506835 0.169140\n' +
        'vt 0.519060 0.184477\n' +
        'vt 0.525012 0.183260\n' +
        'vt 0.527986 0.187509\n' +
        'vt 0.510081 0.187439\n' +
        'vt 0.513089 0.183233\n' +
        'vt 0.530394 0.184704\n' +
        'vt 0.534295 0.184896\n' +
        'vt 0.503793 0.184884\n' +
        'vt 0.507668 0.184674\n' +
        'vt 0.532439 0.180950\n' +
        'vt 0.535149 0.176736\n' +
        'vt 0.502913 0.176781\n' +
        'vt 0.505636 0.180964\n' +
        'vt 0.530712 0.173517\n' +
        'vt 0.507344 0.173554\n' +
        'vt 0.526578 0.177856\n' +
        'vt 0.511521 0.177871\n' +
        'vt 0.519046 0.173265\n' +
        'vt 0.519598 0.218434\n' +
        'vt 0.546187 0.200433\n' +
        'vt 0.492308 0.200655\n' +
        'vt 0.553574 0.172559\n' +
        'vt 0.563121 0.183615\n' +
        'vt 0.474979 0.183937\n' +
        'vt 0.484455 0.172734\n' +
        'vt 0.549340 0.151608\n' +
        'vt 0.563761 0.156937\n' +
        'vt 0.474094 0.157109\n' +
        'vt 0.488561 0.151700\n' +
        'vt 0.559067 0.133966\n' +
        'vt 0.478736 0.134039\n' +
        'vt 0.590405 0.123016\n' +
        'vt 0.577263 0.139872\n' +
        'vt 0.460433 0.140014\n' +
        'vt 0.447168 0.123084\n' +
        'vt 0.596750 0.143221\n' +
        'vt 0.580619 0.160023\n' +
        'vt 0.457138 0.160301\n' +
        'vt 0.440780 0.143450\n' +
        'vt 0.599599 0.161681\n' +
        'vt 0.437984 0.162099\n' +
        'vt 0.528347 0.083894\n' +
        'vt 0.518925 0.085125\n' +
        'vt 0.523542 0.083760\n' +
        'vt 0.514308 0.083755\n' +
        'vt 0.509503 0.083882\n' +
        'vt 0.529350 0.075546\n' +
        'vt 0.528277 0.079832\n' +
        'vt 0.509575 0.079820\n' +
        'vt 0.508505 0.075531\n' +
        'vt 0.524733 0.070302\n' +
        'vt 0.526038 0.073354\n' +
        'vt 0.511818 0.073344\n' +
        'vt 0.513124 0.070293\n' +
        'vt 0.518929 0.068969\n' +
        'vt 0.521305 0.070612\n' +
        'vt 0.516552 0.070608\n' +
        'vt 0.518928 0.072226\n' +
        'vt 0.522769 0.073202\n' +
        'vt 0.520659 0.074723\n' +
        'vt 0.517197 0.074720\n' +
        'vt 0.515088 0.073196\n' +
        'vt 0.526063 0.076553\n' +
        'vt 0.523661 0.075890\n' +
        'vt 0.514195 0.075883\n' +
        'vt 0.511792 0.076543\n' +
        'vt 0.525430 0.081173\n' +
        'vt 0.524718 0.078155\n' +
        'vt 0.513136 0.078148\n' +
        'vt 0.512422 0.081165\n' +
        'vt 0.518925 0.081802\n' +
        'vt 0.521750 0.079521\n' +
        'vt 0.516102 0.079517\n' +
        'vt 0.518927 0.077006\n' +
        'vt 0.522657 0.077229\n' +
        'vt 0.515198 0.077224\n' +
        'vt 0.563413 0.292898\n' +
        'vt 0.567802 0.275146\n' +
        'vt 0.570011 0.285140\n' +
        'vt 0.470084 0.286490\n' +
        'vt 0.472034 0.276343\n' +
        'vt 0.476959 0.294129\n' +
        'vt 0.567255 0.314061\n' +
        'vt 0.570197 0.302366\n' +
        'vt 0.470416 0.303888\n' +
        'vt 0.473757 0.315586\n' +
        'vt 0.581486 0.331822\n' +
        'vt 0.578410 0.320055\n' +
        'vt 0.462715 0.322014\n' +
        'vt 0.460026 0.333994\n' +
        'vt 0.581026 0.261654\n' +
        'vt 0.576446 0.271679\n' +
        'vt 0.463208 0.273055\n' +
        'vt 0.458308 0.263019\n' +
        'vt 0.610831 0.252622\n' +
        'vt 0.596469 0.260651\n' +
        'vt 0.442639 0.262363\n' +
        'vt 0.427869 0.254545\n' +
        'vt 0.636261 0.260038\n' +
        'vt 0.622487 0.258857\n' +
        'vt 0.416164 0.261188\n' +
        'vt 0.402142 0.262744\n' +
        'vt 0.655922 0.278709\n' +
        'vt 0.643415 0.271285\n' +
        'vt 0.395135 0.274453\n' +
        'vt 0.382539 0.282425\n' +
        'vt 0.661161 0.297148\n' +
        'vt 0.655209 0.288712\n' +
        'vt 0.383597 0.292669\n' +
        'vt 0.377767 0.301543\n' +
        'vt 0.654216 0.312197\n' +
        'vt 0.654610 0.303672\n' +
        'vt 0.384718 0.308001\n' +
        'vt 0.385419 0.316721\n' +
        'vt 0.633330 0.327230\n' +
        'vt 0.641191 0.317262\n' +
        'vt 0.398913 0.321395\n' +
        'vt 0.407308 0.331256\n' +
        'vt 0.615388 0.336441\n' +
        'vt 0.622213 0.328502\n' +
        'vt 0.418665 0.332128\n' +
        'vt 0.425906 0.339930\n' +
        'vt 0.599622 0.338489\n' +
        'vt 0.607665 0.333437\n' +
        'vt 0.433616 0.336594\n' +
        'vt 0.441953 0.341405\n' +
        'vt 0.592773 0.331301\n' +
        'vt 0.448607 0.333883\n' +
        'vt 0.601197 0.329954\n' +
        'vt 0.588067 0.323500\n' +
        'vt 0.596222 0.324985\n' +
        'vt 0.444890 0.327625\n' +
        'vt 0.453083 0.325833\n' +
        'vt 0.440035 0.332830\n' +
        'vt 0.614125 0.328738\n' +
        'vt 0.607567 0.327768\n' +
        'vt 0.433498 0.330845\n' +
        'vt 0.426884 0.332067\n' +
        'vt 0.629167 0.321287\n' +
        'vt 0.620093 0.323798\n' +
        'vt 0.420636 0.327267\n' +
        'vt 0.411317 0.325045\n' +
        'vt 0.646757 0.308666\n' +
        'vt 0.636550 0.313467\n' +
        'vt 0.403515 0.317343\n' +
        'vt 0.392929 0.312821\n' +
        'vt 0.652083 0.296313\n' +
        'vt 0.647895 0.301323\n' +
        'vt 0.391522 0.305347\n' +
        'vt 0.387058 0.300363\n' +
        'vt 0.648131 0.281529\n' +
        'vt 0.648663 0.289856\n' +
        'vt 0.390351 0.293627\n' +
        'vt 0.390622 0.285083\n' +
        'vt 0.631331 0.266526\n' +
        'vt 0.638807 0.275375\n' +
        'vt 0.399967 0.278515\n' +
        'vt 0.407344 0.269254\n' +
        'vt 0.610662 0.261063\n' +
        'vt 0.621235 0.264412\n' +
        'vt 0.417574 0.266826\n' +
        'vt 0.428244 0.263138\n' +
        'vt 0.586165 0.268811\n' +
        'vt 0.598904 0.266276\n' +
        'vt 0.440312 0.268138\n' +
        'vt 0.453294 0.270393\n' +
        'vt 0.575821 0.280051\n' +
        'vt 0.581645 0.276446\n' +
        'vt 0.458084 0.278012\n' +
        'vt 0.464073 0.281506\n' +
        'vt 0.577406 0.310010\n' +
        'vt 0.585096 0.315428\n' +
        'vt 0.455806 0.317576\n' +
        'vt 0.463390 0.311840\n' +
        'vt 0.573736 0.293833\n' +
        'vt 0.578536 0.301558\n' +
        'vt 0.461979 0.303333\n' +
        'vt 0.466582 0.295378\n' +
        'vt 0.577824 0.287838\n' +
        'vt 0.462276 0.289437\n' +
        'vt 0.522495 0.410845\n' +
        'vt 0.556798 0.412144\n' +
        'vt 0.538120 0.433346\n' +
        'vt 0.817852 0.456726\n' +
        'vt 0.507920 0.434083\n' +
        'vt 0.217577 0.490396\n' +
        'vt 0.488206 0.413736\n' +
        'vt 0.603660 0.413378\n' +
        'vt 0.581514 0.432290\n' +
        'vt 0.793215 0.444821\n' +
        'vt 0.464335 0.435139\n' +
        'vt 0.245312 0.475251\n' +
        'vt 0.441155 0.417188\n' +
        'vt 0.639259 0.404564\n' +
        'vt 0.628997 0.425416\n' +
        'vt 0.763136 0.431432\n' +
        'vt 0.416189 0.430578\n' +
        'vt 0.279199 0.458114\n' +
        'vt 0.404768 0.410036\n' +
        'vt 0.676825 0.377960\n' +
        'vt 0.670140 0.403795\n' +
        'vt 0.762943 0.399071\n' +
        'vt 0.373405 0.410823\n' +
        'vt 0.277578 0.420825\n' +
        'vt 0.365271 0.384915\n' +
        'vt 0.708272 0.339840\n' +
        'vt 0.709219 0.365014\n' +
        'vt 0.759864 0.357111\n' +
        'vt 0.331524 0.373409\n' +
        'vt 0.278153 0.372617\n' +
        'vt 0.331161 0.347596\n' +
        'vt 0.720519 0.307457\n' +
        'vt 0.731106 0.326933\n' +
        'vt 0.742711 0.323398\n' +
        'vt 0.306912 0.335591\n' +
        'vt 0.294625 0.333545\n' +
        'vt 0.316865 0.314726\n' +
        'vt 0.717152 0.263123\n' +
        'vt 0.736095 0.282280\n' +
        'vt 0.299384 0.288753\n' +
        'vt 0.318582 0.267986\n' +
        'vt 0.688717 0.225966\n' +
        'vt 0.720339 0.235366\n' +
        'vt 0.314404 0.238732\n' +
        'vt 0.347339 0.228601\n' +
        'vt 0.653282 0.194646\n' +
        'vt 0.686267 0.199822\n' +
        'vt 0.349511 0.201381\n' +
        'vt 0.383529 0.195983\n' +
        'vt 0.620926 0.032182\n' +
        'vt 0.638176 0.018993\n' +
        'vt 0.400073 0.018359\n' +
        'vt 0.653051 0.046239\n' +
        'vt 0.636373 0.060103\n' +
        'vt 0.401276 0.059549\n' +
        'vt 0.384754 0.045446\n' +
        'vt 0.417076 0.031729\n' +
        'vt 0.574078 0.021154\n' +
        'vt 0.597184 0.007876\n' +
        'vt 0.440977 0.007638\n' +
        'vt 0.598157 0.040354\n' +
        'vt 0.439766 0.040074\n' +
        'vt 0.463939 0.021033\n' +
        'vt 0.538109 0.033597\n' +
        'vt 0.543191 0.012515\n' +
        'vt 0.494779 0.012515\n' +
        'vt 0.560810 0.036858\n' +
        'vt 0.477134 0.036765\n' +
        'vt 0.499793 0.033565\n' +
        'vt 0.542106 0.047431\n' +
        'vt 0.518930 0.040271\n' +
        'vt 0.495787 0.047387\n' +
        'vt 0.554901 0.055359\n' +
        'vt 0.555160 0.048398\n' +
        'vt 0.482750 0.048319\n' +
        'vt 0.482991 0.055283\n' +
        'vt 0.567592 0.061923\n' +
        'vt 0.564923 0.053872\n' +
        'vt 0.472970 0.053762\n' +
        'vt 0.470263 0.061806\n' +
        'vt 0.586898 0.079500\n' +
        'vt 0.589374 0.064332\n' +
        'vt 0.448411 0.064127\n' +
        'vt 0.450813 0.079348\n' +
        'vt 0.578896 0.048201\n' +
        'vt 0.613594 0.064535\n' +
        'vt 0.424111 0.064192\n' +
        'vt 0.459003 0.048033\n' +
        'vt 0.640436 0.089230\n' +
        'vt 0.614697 0.088950\n' +
        'vt 0.422820 0.088712\n' +
        'vt 0.396894 0.088778\n' +
        'vt 0.603499 0.107667\n' +
        'vt 0.433994 0.107606\n' +
        'vt 0.612348 0.130817\n' +
        'vt 0.632314 0.142577\n' +
        'vt 0.612469 0.148446\n' +
        'vt 0.424899 0.148790\n' +
        'vt 0.404708 0.142842\n' +
        'vt 0.424994 0.130947\n' +
        'vt 0.629477 0.113643\n' +
        'vt 0.407758 0.113503\n' +
        'vt 0.618892 0.166495\n' +
        'vt 0.624256 0.158448\n' +
        'vt 0.412968 0.158979\n' +
        'vt 0.418443 0.167115\n' +
        'vt 0.638168 0.173282\n' +
        'vt 0.398840 0.174104\n' +
        'vt 0.918840 0.058243\n' +
        'vt 0.110619 0.041093\n' +
        'vt 0.915321 0.106557\n' +
        'vt 0.874172 0.106280\n' +
        'vt 0.867162 0.069120\n' +
        'vt 0.165455 0.057945\n' +
        'vt 0.155459 0.096940\n' +
        'vt 0.109722 0.093613\n' +
        'vt 0.848682 0.023851\n' +
        'vt 0.187463 0.012476\n' +
        'vt 0.822966 0.085900\n' +
        'vt 0.790796 0.049165\n' +
        'vt 0.245424 0.043159\n' +
        'vt 0.210591 0.079375\n' +
        'vt 0.738984 0.016494\n' +
        'vt 0.299314 0.012238\n' +
        'vt 0.740019 0.077670\n' +
        'vt 0.692735 0.049429\n' +
        'vt 0.344751 0.047620\n' +
        'vt 0.295904 0.074797\n' +
        'vt 0.660914 0.022290\n' +
        'vt 0.377403 0.021289\n' +
        'vt 0.665510 0.074986\n' +
        'vt 0.371751 0.074100\n' +
        'vt 0.662974 0.106001\n' +
        'vt 0.373850 0.105458\n' +
        'vt 0.753191 0.248572\n' +
        'vt 0.728270 0.204812\n' +
        'vt 0.767740 0.216745\n' +
        'vt 0.263803 0.219071\n' +
        'vt 0.305536 0.206502\n' +
        'vt 0.279982 0.253072\n' +
        'vt 0.970213 0.123637\n' +
        'vt 0.045395 0.108043\n' +
        'vt 0.948445 0.176259\n' +
        'vt 0.904053 0.150177\n' +
        'vt 0.117619 0.142732\n' +
        'vt 0.064606 0.169112\n' +
        'vt 0.937286 0.373591\n' +
        'vt 0.075184 0.399845\n' +
        'vt 0.883895 0.369265\n' +
        'vt 0.884277 0.321936\n' +
        'vt 0.927663 0.320667\n' +
        'vt 0.085021 0.337833\n' +
        'vt 0.135491 0.338458\n' +
        'vt 0.137281 0.392982\n' +
        'vt 0.981379 0.299696\n' +
        'vt 0.022056 0.313076\n' +
        'vt 0.912582 0.278089\n' +
        'vt 0.953507 0.254112\n' +
        'vt 0.054903 0.259502\n' +
        'vt 0.102189 0.288134\n' +
        'vt 0.997191 0.211173\n' +
        'vt 0.005987 0.207240\n' +
        'vt 0.920177 0.217443\n' +
        'vt 0.094363 0.217999\n' +
        'vt 0.768822 0.328799\n' +
        'vt 0.755701 0.299466\n' +
        'vt 0.781218 0.305960\n' +
        'vt 0.251365 0.316433\n' +
        'vt 0.279093 0.308055\n' +
        'vt 0.266340 0.341244\n' +
        'vt 0.814864 0.308831\n' +
        'vt 0.796528 0.281813\n' +
        'vt 0.826931 0.284637\n' +
        'vt 0.200016 0.294492\n' +
        'vt 0.233856 0.290350\n' +
        'vt 0.214073 0.321143\n' +
        'vt 0.857117 0.283970\n' +
        'vt 0.832662 0.261797\n' +
        'vt 0.856952 0.260042\n' +
        'vt 0.165917 0.267485\n' +
        'vt 0.193587 0.269178\n' +
        'vt 0.165962 0.294498\n' +
        'vt 0.878799 0.253264\n' +
        'vt 0.853506 0.237939\n' +
        'vt 0.868810 0.229589\n' +
        'vt 0.151642 0.233304\n' +
        'vt 0.169275 0.242806\n' +
        'vt 0.140919 0.259872\n' +
        'vt 0.852996 0.214930\n' +
        'vt 0.859205 0.189996\n' +
        'vt 0.880528 0.211381\n' +
        'vt 0.138699 0.212655\n' +
        'vt 0.162328 0.189770\n' +
        'vt 0.168233 0.217287\n' +
        'vt 0.891343 0.185226\n' +
        'vt 0.897877 0.242454\n' +
        'vt 0.119168 0.247402\n' +
        'vt 0.128411 0.182764\n' +
        'vt 0.882650 0.283650\n' +
        'vt 0.136794 0.294508\n' +
        'vt 0.849426 0.315471\n' +
        'vt 0.175293 0.329981\n' +
        'vt 0.835225 0.355300\n' +
        'vt 0.797448 0.339438\n' +
        'vt 0.234928 0.354874\n' +
        'vt 0.192710 0.374776\n' +
        'vt 0.788609 0.375951\n' +
        'vt 0.246761 0.395909\n' +
        'vt 0.878585 0.426198\n' +
        'vt 0.145841 0.458376\n' +
        'vt 0.826781 0.402975\n' +
        'vt 0.204444 0.429023\n' +
        'vt 0.792533 0.414220\n' +
        'vt 0.244366 0.439983\n' +
        'vt 0.822977 0.439153\n' +
        'vt 0.210684 0.470420\n' +
        'vt 0.832672 0.459019\n' +
        'vt 0.200588 0.493852\n' +
        'vt 0.775891 0.267404\n' +
        'vt 0.256196 0.273846\n' +
        'vt 0.792774 0.235534\n' +
        'vt 0.811114 0.253581\n' +
        'vt 0.217610 0.259562\n' +
        'vt 0.237289 0.239443\n' +
        'vt 0.820866 0.228877\n' +
        'vt 0.835785 0.236203\n' +
        'vt 0.190191 0.240759\n' +
        'vt 0.206986 0.232834\n' +
        'vt 0.837929 0.212198\n' +
        'vt 0.187928 0.209322\n' +
        'vt 0.098129 0.542627\n' +
        'vt 0.705994 0.109885\n' +
        'vt 0.784533 0.103360\n' +
        'vt 0.751909 0.128786\n' +
        'vt 0.282068 0.127232\n' +
        'vt 0.249322 0.099756\n' +
        'vt 0.329798 0.108802\n' +
        'vt 0.772103 0.167966\n' +
        'vt 0.735926 0.167047\n' +
        'vt 0.787839 0.141361\n' +
        'vt 0.244560 0.139450\n' +
        'vt 0.297723 0.167123\n' +
        'vt 0.259645 0.167397\n' +
        'vt 0.685759 0.166244\n' +
        'vt 0.349935 0.166770\n' +
        'vt 0.645105 0.163152\n' +
        'vt 0.670538 0.133859\n' +
        'vt 0.365713 0.133752\n' +
        'vt 0.391711 0.163784\n' +
        'vt 0.839869 0.175761\n' +
        'vt 0.559246 0.558995\n' +
        'vt 0.840186 0.151312\n' +
        'vt 0.866488 0.162447\n' +
        'vt 0.158421 0.158956\n' +
        'vt 0.190061 0.148630\n' +
        'vt 0.186705 0.175710\n' +
        'vt 0.204630 0.556368\n' +
        'vt 0.872606 0.134179\n' +
        'vt 0.154902 0.127387\n' +
        'vt 0.811434 0.154346\n' +
        'vt 0.444556 0.582103\n' +
        'vt 0.819475 0.126995\n' +
        'vt 0.212383 0.123090\n' +
        'vt 0.221296 0.153122\n' +
        'vt 0.317066 0.580168\n' +
        'vt 0.847824 0.115848\n' +
        'vt 0.183180 0.109416\n' +
        'vt 0.503242 0.887871\n' +
        'vt 0.469277 0.899897\n' +
        'vt 0.743177 0.612264\n' +
        'vt 0.439482 0.879416\n' +
        'vt 0.469003 0.873295\n' +
        'vt 0.285428 0.870463\n' +
        'vt 0.314929 0.877422\n' +
        'vt 0.284422 0.897192\n' +
        'vt 0.026537 0.602076\n' +
        'vt 0.250616 0.884165\n' +
        'vt 0.555496 0.892399\n' +
        'vt 0.726502 0.705992\n' +
        'vt 0.534413 0.867117\n' +
        'vt 0.577677 0.861753\n' +
        'vt 0.176544 0.855826\n' +
        'vt 0.219872 0.862437\n' +
        'vt 0.197968 0.887254\n' +
        'vt 0.034468 0.694287\n' +
        'vt 0.612394 0.835781\n' +
        'vt 0.663727 0.775750\n' +
        'vt 0.579630 0.824752\n' +
        'vt 0.594213 0.796642\n' +
        'vt 0.161805 0.789933\n' +
        'vt 0.175648 0.818593\n' +
        'vt 0.142396 0.828721\n' +
        'vt 0.092795 0.766459\n' +
        'vt 0.589345 0.762975\n' +
        'vt 0.568419 0.770279\n' +
        'vt 0.555736 0.744636\n' +
        'vt 0.201951 0.738903\n' +
        'vt 0.188483 0.764240\n' +
        'vt 0.167695 0.756291\n' +
        'vt 0.538093 0.718190\n' +
        'vt 0.526002 0.729959\n' +
        'vt 0.502537 0.705262\n' +
        'vt 0.256334 0.700942\n' +
        'vt 0.232165 0.725040\n' +
        'vt 0.220390 0.712918\n' +
        'vt 0.478584 0.677534\n' +
        'vt 0.471634 0.697120\n' +
        'vt 0.442215 0.671914\n' +
        'vt 0.317561 0.669089\n' +
        'vt 0.287492 0.693586\n' +
        'vt 0.281043 0.673819\n' +
        'vt 0.500799 0.721082\n' +
        'vt 0.478438 0.715278\n' +
        'vt 0.450203 0.697137\n' +
        'vt 0.308967 0.694144\n' +
        'vt 0.280208 0.711599\n' +
        'vt 0.257653 0.716829\n' +
        'vt 0.544258 0.752732\n' +
        'vt 0.523666 0.742762\n' +
        'vt 0.234156 0.737931\n' +
        'vt 0.213232 0.747344\n' +
        'vt 0.570240 0.792859\n' +
        'vt 0.554893 0.772408\n' +
        'vt 0.202003 0.766764\n' +
        'vt 0.186005 0.786839\n' +
        'vt 0.555533 0.837984\n' +
        'vt 0.561374 0.808768\n' +
        'vt 0.194452 0.803063\n' +
        'vt 0.199480 0.832573\n' +
        'vt 0.499999 0.858604\n' +
        'vt 0.528822 0.837834\n' +
        'vt 0.226317 0.833175\n' +
        'vt 0.254690 0.854846\n' +
        'vt 0.451223 0.852362\n' +
        'vt 0.479919 0.844388\n' +
        'vt 0.275256 0.841120\n' +
        'vt 0.303868 0.849915\n' +
        'vt 0.778217 0.192871\n' +
        'vt 0.790754 0.164650\n' +
        'vt 0.392903 0.649008\n' +
        'vt 0.789259 0.181741\n' +
        'vt 0.240716 0.180943\n' +
        'vt 0.239797 0.163311\n' +
        'vt 0.367376 0.647321\n' +
        'vt 0.252507 0.193316\n' +
        'vt 0.425767 0.635650\n' +
        'vt 0.420672 0.680946\n' +
        'vt 0.338943 0.678648\n' +
        'vt 0.334793 0.633335\n' +
        'vt 0.795563 0.208848\n' +
        'vt 0.233810 0.210443\n' +
        'vt 0.412068 0.878520\n' +
        'vt 0.831933 0.213221\n' +
        'vt 0.396676 0.851779\n' +
        'vt 0.827197 0.214662\n' +
        'vt 0.423074 0.854730\n' +
        'vt 0.332089 0.853056\n' +
        'vt 0.358702 0.850803\n' +
        'vt 0.199417 0.218646\n' +
        'vt 0.342507 0.877267\n' +
        'vt 0.042440 0.543531\n' +
        'vt 0.441223 0.707419\n' +
        'vt 0.418054 0.702412\n' +
        'vt 0.341073 0.700226\n' +
        'vt 0.317711 0.704681\n' +
        'vt 0.428815 0.720446\n' +
        'vt 0.410785 0.720997\n' +
        'vt 0.389712 0.698212\n' +
        'vt 0.799107 0.180789\n' +
        'vt 0.369619 0.696707\n' +
        'vt 0.230055 0.179353\n' +
        'vt 0.347908 0.719053\n' +
        'vt 0.329828 0.718052\n' +
        'vt 0.419760 0.742959\n' +
        'vt 0.403090 0.738535\n' +
        'vt 0.427059 0.735523\n' +
        'vt 0.331211 0.733225\n' +
        'vt 0.355190 0.736855\n' +
        'vt 0.338348 0.740872\n' +
        'vt 0.412842 0.764844\n' +
        'vt 0.402753 0.787081\n' +
        'vt 0.384658 0.752861\n' +
        'vt 0.809229 0.193848\n' +
        'vt 0.373335 0.751721\n' +
        'vt 0.218157 0.194624\n' +
        'vt 0.354294 0.785622\n' +
        'vt 0.344732 0.763023\n' +
        'vt 0.418795 0.827665\n' +
        'vt 0.393131 0.818442\n' +
        'vt 0.820687 0.206424\n' +
        'vt 0.422802 0.802164\n' +
        'vt 0.333764 0.800245\n' +
        'vt 0.363148 0.817385\n' +
        'vt 0.204798 0.210494\n' +
        'vt 0.337116 0.825974\n' +
        'vt 0.443879 0.830357\n' +
        'vt 0.311841 0.828005\n' +
        'vt 0.811969 0.213107\n' +
        'vt 0.215610 0.215928\n' +
        'vt 0.796242 0.189981\n' +
        'vt 0.232899 0.189619\n' +
        'vt 0.468201 0.829701\n' +
        'vt 0.441961 0.809870\n' +
        'vt 0.462695 0.812987\n' +
        'vt 0.293411 0.810050\n' +
        'vt 0.314317 0.807477\n' +
        'vt 0.287428 0.826686\n' +
        'vt 0.427277 0.781602\n' +
        'vt 0.443343 0.790299\n' +
        'vt 0.313449 0.787786\n' +
        'vt 0.329807 0.779475\n' +
        'vt 0.421352 0.755005\n' +
        'vt 0.430475 0.765576\n' +
        'vt 0.327013 0.763300\n' +
        'vt 0.336442 0.752924\n' +
        'vt 0.431514 0.744595\n' +
        'vt 0.431645 0.753908\n' +
        'vt 0.326140 0.751558\n' +
        'vt 0.326511 0.742215\n' +
        'vt 0.437751 0.731694\n' +
        'vt 0.442940 0.742346\n' +
        'vt 0.315103 0.739666\n' +
        'vt 0.320580 0.729112\n' +
        'vt 0.440439 0.719987\n' +
        'vt 0.445047 0.728140\n' +
        'vt 0.313350 0.725362\n' +
        'vt 0.318179 0.717305\n' +
        'vt 0.460060 0.714469\n' +
        'vt 0.450206 0.721480\n' +
        'vt 0.308347 0.718553\n' +
        'vt 0.298648 0.711268\n' +
        'vt 0.507612 0.833346\n' +
        'vt 0.493072 0.824997\n' +
        'vt 0.262579 0.821280\n' +
        'vt 0.247746 0.829260\n' +
        'vt 0.546373 0.817274\n' +
        'vt 0.528587 0.820584\n' +
        'vt 0.227039 0.815856\n' +
        'vt 0.209273 0.812030\n' +
        'vt 0.555446 0.788518\n' +
        'vt 0.546607 0.800770\n' +
        'vt 0.209509 0.795453\n' +
        'vt 0.200986 0.782905\n' +
        'vt 0.538068 0.761113\n' +
        'vt 0.540941 0.777680\n' +
        'vt 0.215856 0.772448\n' +
        'vt 0.219206 0.755920\n' +
        'vt 0.503465 0.736077\n' +
        'vt 0.518703 0.756138\n' +
        'vt 0.238766 0.751476\n' +
        'vt 0.254583 0.731782\n' +
        'vt 0.481361 0.732039\n' +
        'vt 0.276841 0.728324\n' +
        'vt 0.445728 0.755340\n' +
        'vt 0.454782 0.739673\n' +
        'vt 0.461938 0.756103\n' +
        'vt 0.295687 0.752972\n' +
        'vt 0.303291 0.736677\n' +
        'vt 0.311972 0.752630\n' +
        'vt 0.463772 0.773855\n' +
        'vt 0.477646 0.756638\n' +
        'vt 0.481568 0.776312\n' +
        'vt 0.275457 0.772726\n' +
        'vt 0.279916 0.753093\n' +
        'vt 0.293379 0.770737\n' +
        'vt 0.482934 0.794027\n' +
        'vt 0.498813 0.776847\n' +
        'vt 0.499632 0.792814\n' +
        'vt 0.256881 0.788791\n' +
        'vt 0.258143 0.772794\n' +
        'vt 0.273607 0.790467\n' +
        'vt 0.504672 0.805610\n' +
        'vt 0.515891 0.789667\n' +
        'vt 0.520259 0.799106\n' +
        'vt 0.236004 0.794528\n' +
        'vt 0.240654 0.785180\n' +
        'vt 0.251468 0.801494\n' +
        'vt 0.513928 0.816510\n' +
        'vt 0.485253 0.811116\n' +
        'vt 0.270813 0.807558\n' +
        'vt 0.241872 0.812178\n' +
        'vt 0.462765 0.793509\n' +
        'vt 0.293866 0.790492\n' +
        'vt 0.445624 0.771257\n' +
        'vt 0.311660 0.768608\n' +
        'vt 0.465322 0.734917\n' +
        'vt 0.292842 0.731633\n' +
        'vt 0.496227 0.755757\n' +
        'vt 0.261310 0.751711\n' +
        'vt 0.519941 0.775250\n' +
        'vt 0.236995 0.770605\n' +
        'vt 0.533132 0.790820\n' +
        'vt 0.223318 0.785848\n' +
        'vt 0.531027 0.808817\n' +
        'vt 0.224920 0.803973\n' +
        'vt 0.525165 0.689932\n' +
        'vt 0.471551 0.641448\n' +
        'vt 0.533986 0.655417\n' +
        'vt 0.226531 0.650851\n' +
        'vt 0.289024 0.638180\n' +
        'vt 0.234153 0.685031\n' +
        'vt 0.573537 0.733365\n' +
        'vt 0.575090 0.707013\n' +
        'vt 0.183790 0.700745\n' +
        'vt 0.184467 0.727088\n' +
        'vt 0.621437 0.765901\n' +
        'vt 0.605312 0.745594\n' +
        'vt 0.152269 0.738340\n' +
        'vt 0.135450 0.758162\n' +
        'vt 0.677691 0.741010\n' +
        'vt 0.635808 0.749981\n' +
        'vt 0.121624 0.741714\n' +
        'vt 0.080357 0.731271\n' +
        'vt 0.705113 0.662631\n' +
        'vt 0.659670 0.704618\n' +
        'vt 0.099876 0.695964\n' +
        'vt 0.057959 0.653021\n' +
        'vt 0.706123 0.582542\n' +
        'vt 0.834642 0.206919\n' +
        'vt 0.660188 0.632224\n' +
        'vt 0.105204 0.626959\n' +
        'vt 0.069112 0.583140\n' +
        'vt 0.607278 0.675536\n' +
        'vt 0.582707 0.612627\n' +
        'vt 0.182120 0.609508\n' +
        'vt 0.153007 0.669026\n' +
        'vt 0.619125 0.728415\n' +
        'vt 0.139081 0.720753\n' +
        'vt 0.838530 0.201060\n' +
        'vt 0.645912 0.579166\n' +
        'vt 0.131457 0.574067\n' +
        'vt 0.504604 0.594956\n' +
        'vt 0.257354 0.592122\n' +
        'vt 0.881611 0.575125\n' +
        'vt 0.878400 0.836507\n' +
        'vt 0.884449 0.542614\n' +
        'vt 0.879793 0.869113\n' +
        'vt 0.835972 0.561317\n' +
        'vt 0.832194 0.848276\n' +
        'vt 0.853847 0.586450\n' +
        'vt 0.851167 0.823962\n' +
        'vt 0.841739 0.613574\n' +
        'vt 0.840274 0.796326\n' +
        'vt 0.812824 0.609855\n' +
        'vt 0.811223 0.798759\n' +
        'vt 0.830128 0.661567\n' +
        'vt 0.830805 0.747866\n' +
        'vt 0.851551 0.642107\n' +
        'vt 0.851343 0.768258\n' +
        'vt 0.878517 0.654471\n' +
        'vt 0.878831 0.757103\n' +
        'vt 0.879318 0.683121\n' +
        'vt 0.880903 0.728516\n' +
        'vt 0.929099 0.661362\n' +
        'vt 0.929670 0.752463\n' +
        'vt 0.906939 0.643081\n' +
        'vt 0.906720 0.769743\n' +
        'vt 0.919103 0.615721\n' +
        'vt 0.917657 0.797616\n' +
        'vt 0.949468 0.612185\n' +
        'vt 0.947836 0.802496\n' +
        'vt 0.930860 0.563528\n' +
        'vt 0.927087 0.850279\n' +
        'vt 0.908631 0.587254\n' +
        'vt 0.905932 0.825590\n' +
        'vt 0.897029 0.599464\n' +
        'vt 0.894883 0.812876\n' +
        'vt 0.903212 0.616842\n' +
        'vt 0.901832 0.795790\n' +
        'vt 0.895762 0.632844\n' +
        'vt 0.895100 0.779473\n' +
        'vt 0.879189 0.638681\n' +
        'vt 0.878802 0.772907\n' +
        'vt 0.863335 0.631517\n' +
        'vt 0.862645 0.779360\n' +
        'vt 0.857327 0.615518\n' +
        'vt 0.855933 0.795076\n' +
        'vt 0.864322 0.599298\n' +
        'vt 0.862202 0.811591\n' +
        'vt 0.880719 0.592082\n' +
        'vt 0.878262 0.819528\n' +
        'vt 0.880250 0.601545\n' +
        'vt 0.878214 0.810053\n' +
        'vt 0.870420 0.606296\n' +
        'vt 0.868604 0.804870\n' +
        'vt 0.866481 0.616122\n' +
        'vt 0.865106 0.794879\n' +
        'vt 0.870170 0.625153\n' +
        'vt 0.869191 0.786021\n' +
        'vt 0.879396 0.629307\n' +
        'vt 0.878593 0.782281\n' +
        'vt 0.888953 0.626244\n' +
        'vt 0.888004 0.785765\n' +
        'vt 0.893657 0.616800\n' +
        'vt 0.892285 0.795408\n' +
        'vt 0.890242 0.606081\n' +
        'vt 0.888398 0.805965\n' +
        'vt 0.528376 0.056369\n' +
        'vt 0.509485 0.056353\n' +
        'vt 0.542425 0.059639\n' +
        'vt 0.495453 0.059597\n' +
        'vt 0.548969 0.064623\n' +
        'vt 0.488903 0.064568\n' +
        'vt 0.553979 0.074793\n' +
        'vt 0.483867 0.074736\n' +
        'vt 0.563317 0.098370\n' +
        'vt 0.474459 0.098347\n' +
        'vt 0.607783 0.201317\n' +
        'vt 0.429985 0.202349\n' +
        'vt 0.652025 0.228651\n' +
        'vt 0.385294 0.230871\n' +
        'vt 0.684216 0.257873\n' +
        'vt 0.352716 0.261687\n' +
        'vt 0.697734 0.291262\n' +
        'vt 0.339803 0.296775\n' +
        'vt 0.691800 0.319376\n' +
        'vt 0.347111 0.325707\n' +
        'vt 0.669060 0.346556\n' +
        'vt 0.371656 0.352492\n' +
        'vt 0.637539 0.374296\n' +
        'vt 0.405052 0.379277\n' +
        'vt 0.612565 0.385848\n' +
        'vt 0.430882 0.389829\n' +
        'vt 0.579528 0.380831\n' +
        'vt 0.463955 0.383313\n' +
        'vt 0.539646 0.370138\n' +
        'vt 0.503550 0.370878\n' +
        'vt 0.584222 0.354838\n' +
        'vt 0.458148 0.357313\n' +
        'vt 0.608513 0.359610\n' +
        'vt 0.433834 0.363117\n' +
        'vt 0.627448 0.351385\n' +
        'vt 0.414294 0.355570\n' +
        'vt 0.653248 0.331731\n' +
        'vt 0.387172 0.336643\n' +
        'vt 0.673229 0.311613\n' +
        'vt 0.365902 0.316900\n' +
        'vt 0.675648 0.291443\n' +
        'vt 0.362661 0.296196\n' +
        'vt 0.662642 0.265966\n' +
        'vt 0.375235 0.269520\n' +
        'vt 0.634514 0.244436\n' +
        'vt 0.403531 0.246741\n' +
        'vt 0.591326 0.234859\n' +
        'vt 0.447238 0.236147\n' +
        'vt 0.553314 0.247169\n' +
        'vt 0.485963 0.247850\n' +
        'vt 0.554699 0.339520\n' +
        'vt 0.487253 0.340746\n' +
        'vt 0.539226 0.311235\n' +
        'vt 0.501819 0.311809\n' +
        'vt 0.539936 0.277011\n' +
        'vt 0.500127 0.277528\n' +
        'vt 0.524838 0.064612\n' +
        'vt 0.513021 0.064602\n' +
        'vt 0.533857 0.067317\n' +
        'vt 0.504007 0.067292\n' +
        'vt 0.537842 0.074443\n' +
        'vt 0.500015 0.074414\n' +
        'vt 0.542399 0.106568\n' +
        'vt 0.495440 0.106568\n' +
        'vt 0.539593 0.084350\n' +
        'vt 0.498254 0.084324\n' +
        'vt 0.527150 0.140957\n' +
        'vt 0.510768 0.140974\n' +
        'vt 0.525817 0.110508\n' +
        'vt 0.512046 0.110509\n' +
        'vt 0.525410 0.089838\n' +
        'vt 0.512439 0.089832\n' +
        'vt 0.539743 0.168694\n' +
        'vt 0.498278 0.168768\n' +
        'vt 0.541629 0.182581\n' +
        'vt 0.496512 0.182646\n' +
        'vt 0.532398 0.193396\n' +
        'vt 0.506083 0.193379\n' +
        'vt 0.521441 0.192080\n' +
        'vt 0.516430 0.192047\n' +
        'vt 0.527560 0.158945\n' +
        'vt 0.510424 0.158970\n' +
        'vt 0.525878 0.166063\n' +
        'vt 0.512144 0.166083\n' +
        'vt 0.523785 0.185847\n' +
        'vt 0.514311 0.185800\n' +
        'vt 0.531658 0.187170\n' +
        'vt 0.506414 0.187119\n' +
        'vt 0.535327 0.181109\n' +
        'vt 0.502754 0.181133\n' +
        'vt 0.534025 0.172707\n' +
        'vt 0.504018 0.172755\n' +
        'vt 0.528580 0.181687\n' +
        'vt 0.509504 0.181682\n' +
        'vt 0.525563 0.173411\n' +
        'vt 0.512515 0.173431\n' +
        'vt 0.534465 0.212776\n' +
        'vt 0.504480 0.212913\n' +
        'vt 0.551985 0.185724\n' +
        'vt 0.486203 0.185938\n' +
        'vt 0.552239 0.162029\n' +
        'vt 0.485708 0.162163\n' +
        'vt 0.546685 0.138563\n' +
        'vt 0.491182 0.138620\n' +
        'vt 0.573726 0.128028\n' +
        'vt 0.463980 0.128105\n' +
        'vt 0.579591 0.149773\n' +
        'vt 0.458115 0.149978\n' +
        'vt 0.581324 0.172904\n' +
        'vt 0.456525 0.173290\n' +
        'vt 0.524245 0.085168\n' +
        'vt 0.513604 0.085161\n' +
        'vt 0.529899 0.080034\n' +
        'vt 0.507954 0.080019\n' +
        'vt 0.527413 0.072283\n' +
        'vt 0.510444 0.072271\n' +
        'vt 0.521856 0.069271\n' +
        'vt 0.516002 0.069266\n' +
        'vt 0.520844 0.072458\n' +
        'vt 0.517013 0.072455\n' +
        'vt 0.524641 0.074536\n' +
        'vt 0.513215 0.074528\n' +
        'vt 0.526471 0.079118\n' +
        'vt 0.511382 0.079109\n' +
        'vt 0.522672 0.081831\n' +
        'vt 0.515179 0.081826\n' +
        'vt 0.521002 0.077116\n' +
        'vt 0.516853 0.077113\n' +
        'vt 0.523568 0.077141\n' +
        'vt 0.514287 0.077134\n' +
        'vt 0.564823 0.283411\n' +
        'vt 0.475265 0.284604\n' +
        'vt 0.564043 0.303370\n' +
        'vt 0.476646 0.304705\n' +
        'vt 0.573336 0.323987\n' +
        'vt 0.467968 0.325800\n' +
        'vt 0.572444 0.268073\n' +
        'vt 0.467157 0.269314\n' +
        'vt 0.595063 0.255785\n' +
        'vt 0.443944 0.257390\n' +
        'vt 0.624401 0.254227\n' +
        'vt 0.414100 0.256508\n' +
        'vt 0.647340 0.268750\n' +
        'vt 0.391043 0.271964\n' +
        'vt 0.660267 0.288391\n' +
        'vt 0.378390 0.292508\n' +
        'vt 0.659519 0.304805\n' +
        'vt 0.379722 0.309349\n' +
        'vt 0.644524 0.319999\n' +
        'vt 0.395613 0.324317\n' +
        'vt 0.623647 0.332753\n' +
        'vt 0.417377 0.336501\n' +
        'vt 0.607684 0.338383\n' +
        'vt 0.433791 0.341604\n' +
        'vt 0.590625 0.336522\n' +
        'vt 0.450972 0.339077\n' +
        'vt 0.594577 0.327670\n' +
        'vt 0.446650 0.330280\n' +
        'vt 0.607641 0.330160\n' +
        'vt 0.433514 0.333272\n' +
        'vt 0.621105 0.325749\n' +
        'vt 0.419683 0.329287\n' +
        'vt 0.638600 0.315216\n' +
        'vt 0.401484 0.319206\n' +
        'vt 0.650826 0.302565\n' +
        'vt 0.388560 0.306727\n' +
        'vt 0.651467 0.289241\n' +
        'vt 0.387455 0.293089\n' +
        'vt 0.640733 0.273509\n' +
        'vt 0.397943 0.276657\n' +
        'vt 0.621576 0.262193\n' +
        'vt 0.417172 0.264571\n' +
        'vt 0.597758 0.263913\n' +
        'vt 0.441413 0.265710\n' +
        'vt 0.579378 0.274220\n' +
        'vt 0.460314 0.275701\n' +
        'vt 0.582116 0.317393\n' +
        'vt 0.458883 0.319456\n' +
        'vt 0.574762 0.301887\n' +
        'vt 0.465797 0.303547\n' +
        'vt 0.574109 0.286567\n' +
        'vt 0.465990 0.288047\n' +
        'vt 0.538281 0.411091\n' +
        'vt 0.506719 0.411819\n' +
        'vt 0.580281 0.413307\n' +
        'vt 0.464672 0.416006\n' +
        'vt 0.622306 0.410754\n' +
        'vt 0.422223 0.415451\n' +
        'vt 0.657775 0.393384\n' +
        'vt 0.385426 0.399631\n' +
        'vt 0.694311 0.358834\n' +
        'vt 0.346443 0.366300\n' +
        'vt 0.716338 0.324076\n' +
        'vt 0.322025 0.331806\n' +
        'vt 0.721595 0.285733\n' +
        'vt 0.314788 0.291912\n' +
        'vt 0.705055 0.243279\n' +
        'vt 0.330657 0.246922\n' +
        'vt 0.671765 0.210086\n' +
        'vt 0.364677 0.211973\n' +
        'vt 0.638598 0.040073\n' +
        'vt 0.399313 0.039452\n' +
        'vt 0.597999 0.024656\n' +
        'vt 0.440036 0.024385\n' +
        'vt 0.553265 0.025336\n' +
        'vt 0.484696 0.025281\n' +
        'vt 0.531703 0.042785\n' +
        'vt 0.506172 0.042762\n' +
        'vt 0.549446 0.051869\n' +
        'vt 0.488452 0.051807\n' +
        'vt 0.560473 0.058029\n' +
        'vt 0.477409 0.057935\n' +
        'vt 0.576860 0.068910\n' +
        'vt 0.460937 0.068767\n' +
        'vt 0.596099 0.054317\n' +
        'vt 0.441733 0.054062\n' +
        'vt 0.564925 0.046689\n' +
        'vt 0.472992 0.046578\n' +
        'vt 0.628541 0.077349\n' +
        'vt 0.408979 0.076944\n' +
        'vt 0.596047 0.093310\n' +
        'vt 0.441554 0.093187\n' +
        'vt 0.612957 0.140296\n' +
        'vt 0.424379 0.140539\n' +
        'vt 0.608900 0.120064\n' +
        'vt 0.428506 0.120089\n' +
        'vt 0.612925 0.156464\n' +
        'vt 0.424469 0.156911\n' +
        'vt 0.633655 0.179673\n' +
        'vt 0.403478 0.180592\n' +
        'vt 0.893515 0.084702\n' +
        'vt 0.135967 0.071959\n' +
        'vt 0.833205 0.057037\n' +
        'vt 0.201549 0.048328\n' +
        'vt 0.739247 0.047944\n' +
        'vt 0.297791 0.044340\n' +
        'vt 0.667604 0.048991\n' +
        'vt 0.370099 0.047937\n' +
        'vt 0.650342 0.097629\n' +
        'vt 0.386807 0.097126\n' +
        'vt 0.743544 0.225522\n' +
        'vt 0.289648 0.228397\n' +
        'vt 0.934162 0.138519\n' +
        'vt 0.084748 0.127507\n' +
        'vt 0.908042 0.346695\n' +
        'vt 0.108509 0.367723\n' +
        'vt 0.943355 0.289411\n' +
        'vt 0.066438 0.301142\n' +
        'vt 0.954767 0.215703\n' +
        'vt 0.054806 0.214456\n' +
        'vt 0.760983 0.314960\n' +
        'vt 0.274091 0.325343\n' +
        'vt 0.804507 0.295772\n' +
        'vt 0.225226 0.306116\n' +
        'vt 0.844362 0.272860\n' +
        'vt 0.180310 0.281734\n' +
        'vt 0.865486 0.245712\n' +
        'vt 0.155943 0.251381\n' +
        'vt 0.865654 0.210853\n' +
        'vt 0.154542 0.212543\n' +
        'vt 0.896975 0.214875\n' +
        'vt 0.120596 0.216031\n' +
        'vt 0.892698 0.264948\n' +
        'vt 0.125101 0.273140\n' +
        'vt 0.868843 0.300471\n' +
        'vt 0.152856 0.313492\n' +
        'vt 0.823563 0.328376\n' +
        'vt 0.204988 0.343582\n' +
        'vt 0.776953 0.348941\n' +
        'vt 0.258476 0.364482\n' +
        'vt 0.854618 0.388654\n' +
        'vt 0.171808 0.413975\n' +
        'vt 0.778037 0.422134\n' +
        'vt 0.261505 0.448254\n' +
        'vt 0.806998 0.409096\n' +
        'vt 0.227454 0.434955\n' +
        'vt 0.825908 0.453176\n' +
        'vt 0.208078 0.486741\n' +
        'vt 0.755260 0.275192\n' +
        'vt 0.278660 0.281719\n' +
        'vt 0.794685 0.260478\n' +
        'vt 0.235624 0.266753\n' +
        'vt 0.824924 0.245952\n' +
        'vt 0.202485 0.251470\n' +
        'vt 0.844367 0.224985\n' +
        'vt 0.179307 0.228068\n' +
        'vt 0.744857 0.104270\n' +
        'vt 0.290077 0.102066\n' +
        'vt 0.761887 0.150943\n' +
        'vt 0.270998 0.149983\n' +
        'vt 0.709166 0.184863\n' +
        'vt 0.325569 0.185815\n' +
        'vt 0.658117 0.151769\n' +
        'vt 0.378355 0.152110\n' +
        'vt 0.678473 0.116165\n' +
        'vt 0.357848 0.115642\n' +
        'vt 0.635572 0.165415\n' +
        'vt 0.401462 0.166095\n' +
        'vt 0.852504 0.169021\n' +
        'vt 0.173307 0.167243\n' +
        'vt 0.882750 0.157347\n' +
        'vt 0.140836 0.152190\n' +
        'vt 0.816039 0.142025\n' +
        'vt 0.215949 0.139452\n' +
        'vt 0.819803 0.108584\n' +
        'vt 0.212732 0.103516\n' +
        'vt 0.864662 0.119320\n' +
        'vt 0.164991 0.111832\n' +
        'vt 0.468363 0.886808\n' +
        'vt 0.285700 0.884061\n' +
        'vt 0.543312 0.879960\n' +
        'vt 0.210565 0.875093\n' +
        'vt 0.593993 0.830799\n' +
        'vt 0.161038 0.824252\n' +
        'vt 0.578670 0.768161\n' +
        'vt 0.178252 0.761815\n' +
        'vt 0.530449 0.724075\n' +
        'vt 0.227874 0.719024\n' +
        'vt 0.471787 0.687538\n' +
        'vt 0.287581 0.683989\n' +
        'vt 0.474743 0.706583\n' +
        'vt 0.284136 0.702984\n' +
        'vt 0.524153 0.736382\n' +
        'vt 0.233842 0.731524\n' +
        'vt 0.560742 0.771353\n' +
        'vt 0.196162 0.765539\n' +
        'vt 0.569104 0.816662\n' +
        'vt 0.186459 0.810770\n' +
        'vt 0.529970 0.852091\n' +
        'vt 0.224761 0.847465\n' +
        'vt 0.473352 0.858317\n' +
        'vt 0.281470 0.855294\n' +
        'vt 0.781750 0.177204\n' +
        'vt 0.249003 0.176615\n' +
        'vt 0.417018 0.659387\n' +
        'vt 0.343047 0.657161\n' +
        'vt 0.784738 0.212595\n' +
        'vt 0.245585 0.214535\n' +
        'vt 0.416800 0.866760\n' +
        'vt 0.338070 0.865317\n' +
        'vt 0.431196 0.696570\n' +
        'vt 0.328035 0.694049\n' +
        'vt 0.411919 0.710833\n' +
        'vt 0.347022 0.708824\n' +
        'vt 0.414613 0.733330\n' +
        'vt 0.343757 0.731337\n' +
        'vt 0.400080 0.760071\n' +
        'vt 0.357667 0.758561\n' +
        'vt 0.409092 0.809450\n' +
        'vt 0.347346 0.807928\n' +
        'vt 0.433115 0.841909\n' +
        'vt 0.322345 0.839902\n' +
        'vt 0.820116 0.216249\n' +
        'vt 0.206857 0.219915\n' +
        'vt 0.803000 0.201945\n' +
        'vt 0.225405 0.203129\n' +
        'vt 0.794268 0.183563\n' +
        'vt 0.235195 0.182579\n' +
        'vt 0.453337 0.821327\n' +
        'vt 0.302584 0.818678\n' +
        'vt 0.433605 0.796402\n' +
        'vt 0.323065 0.794172\n' +
        'vt 0.422490 0.766652\n' +
        'vt 0.335000 0.764588\n' +
        'vt 0.425510 0.748812\n' +
        'vt 0.332428 0.746600\n' +
        'vt 0.435649 0.738566\n' +
        'vt 0.322514 0.736060\n' +
        'vt 0.438459 0.725659\n' +
        'vt 0.320022 0.723042\n' +
        'vt 0.446842 0.714794\n' +
        'vt 0.311890 0.711935\n' +
        'vt 0.486622 0.833925\n' +
        'vt 0.268810 0.830424\n' +
        'vt 0.529168 0.827618\n' +
        'vt 0.226257 0.822904\n' +
        'vt 0.554987 0.803516\n' +
        'vt 0.201017 0.797971\n' +
        'vt 0.549316 0.774269\n' +
        'vt 0.207549 0.768790\n' +
        'vt 0.522834 0.748764\n' +
        'vt 0.234825 0.743969\n' +
        'vt 0.480694 0.722970\n' +
        'vt 0.277748 0.719250\n' +
        'vt 0.451875 0.748121\n' +
        'vt 0.305990 0.745228\n' +
        'vt 0.471966 0.765952\n' +
        'vt 0.285367 0.762588\n' +
        'vt 0.490661 0.785658\n' +
        'vt 0.266079 0.781857\n' +
        'vt 0.509097 0.797073\n' +
        'vt 0.247264 0.792802\n' +
        'vt 0.499239 0.815328\n' +
        'vt 0.256653 0.811401\n' +
        'vt 0.473131 0.803520\n' +
        'vt 0.283190 0.800263\n' +
        'vt 0.453735 0.782360\n' +
        'vt 0.303227 0.779540\n' +
        'vt 0.438194 0.761384\n' +
        'vt 0.319375 0.758892\n' +
        'vt 0.453412 0.730198\n' +
        'vt 0.304908 0.727211\n' +
        'vt 0.480566 0.744291\n' +
        'vt 0.277314 0.740632\n' +
        'vt 0.509422 0.766252\n' +
        'vt 0.247795 0.761875\n' +
        'vt 0.528067 0.783052\n' +
        'vt 0.228623 0.778200\n' +
        'vt 0.533892 0.799710\n' +
        'vt 0.222302 0.794749\n' +
        'vt 0.525734 0.815686\n' +
        'vt 0.230041 0.811018\n' +
        'vt 0.496540 0.666735\n' +
        'vt 0.263421 0.662656\n' +
        'vt 0.550671 0.711970\n' +
        'vt 0.208001 0.706345\n' +
        'vt 0.596168 0.753465\n' +
        'vt 0.161163 0.746532\n' +
        'vt 0.650635 0.761168\n' +
        'vt 0.106424 0.752371\n' +
        'vt 0.695537 0.704955\n' +
        'vt 0.064692 0.694847\n' +
        'vt 0.706712 0.622096\n' +
        'vt 0.060335 0.614941\n' +
        'vt 0.594906 0.643849\n' +
        'vt 0.167097 0.638884\n' +
        'vt 0.615479 0.704842\n' +
        'vt 0.143648 0.697517\n' +
        'vt 0.619743 0.742110\n' +
        'vt 0.137953 0.734378\n' +
        'vt 0.835440 0.207619\n' +
        'vt 0.082566 0.560285\n' +
        'vt 0.570415 0.585463\n' +
        'vt 0.194407 0.582356\n' +
        'vt 0.455879 0.613165\n' +
        'vt 0.305248 0.610596\n' +
        's 0\n' +
        'f 47/47/1 509/558/1 1513/1612/1 508/557/1\n' +
        'f 509/558/2 1/1/2 510/559/2 1513/1612/2\n' +
        'f 1513/1612/3 510/559/3 3/3/3 511/560/3\n' +
        'f 508/557/4 1513/1612/4 511/560/4 45/45/4\n' +
        'f 4/4/5 513/562/5 1514/1613/5 512/561/5\n' +
        'f 513/562/6 2/2/6 514/563/6 1514/1613/6\n' +
        'f 1514/1613/7 514/563/7 48/48/7 515/564/7\n' +
        'f 512/561/8 1514/1613/8 515/564/8 46/46/8\n' +
        'f 45/45/9 511/560/9 1515/1614/9 516/565/9\n' +
        'f 511/560/10 3/3/10 517/566/10 1515/1614/10\n' +
        'f 1515/1614/11 517/566/11 5/5/11 518/567/11\n' +
        'f 516/565/12 1515/1614/12 518/567/12 43/43/12\n' +
        'f 6/6/13 520/569/13 1516/1615/13 519/568/13\n' +
        'f 520/569/14 4/4/14 512/561/14 1516/1615/14\n' +
        'f 1516/1615/15 512/561/15 46/46/15 521/570/15\n' +
        'f 519/568/16 1516/1615/16 521/570/16 44/44/16\n' +
        'f 3/3/17 522/571/17 1517/1616/17 517/566/17\n' +
        'f 522/571/18 9/9/18 523/572/18 1517/1616/18\n' +
        'f 1517/1616/19 523/572/19 7/7/19 524/573/19\n' +
        'f 517/566/20 1517/1616/20 524/573/20 5/5/20\n' +
        'f 8/8/21 526/575/21 1518/1617/21 525/574/21\n' +
        'f 526/575/22 10/10/22 527/576/22 1518/1617/22\n' +
        'f 1518/1617/23 527/576/23 4/4/23 520/569/23\n' +
        'f 525/574/24 1518/1617/24 520/569/24 6/6/24\n' +
        'f 1/1/25 528/577/25 1519/1618/25 510/559/25\n' +
        'f 528/577/26 11/11/26 529/578/26 1519/1618/26\n' +
        'f 1519/1618/27 529/578/27 9/9/27 522/571/27\n' +
        'f 510/559/28 1519/1618/28 522/571/28 3/3/28\n' +
        'f 10/10/29 530/579/29 1520/1619/29 527/576/29\n' +
        'f 530/579/30 12/12/30 531/580/30 1520/1619/30\n' +
        'f 1520/1619/31 531/580/31 2/2/31 513/562/31\n' +
        'f 527/576/32 1520/1619/32 513/562/32 4/4/32\n' +
        'f 11/11/33 532/581/33 1521/1620/33 529/578/33\n' +
        'f 532/581/34 13/13/34 533/582/34 1521/1620/34\n' +
        'f 1521/1620/35 533/582/35 15/15/35 534/583/35\n' +
        'f 529/578/36 1521/1620/36 534/583/36 9/9/36\n' +
        'f 16/16/37 536/585/37 1522/1621/37 535/584/37\n' +
        'f 536/585/38 14/14/38 537/586/38 1522/1621/38\n' +
        'f 1522/1621/39 537/586/39 12/12/39 530/579/39\n' +
        'f 535/584/40 1522/1621/40 530/579/40 10/10/40\n' +
        'f 9/9/41 534/583/41 1523/1622/41 523/572/41\n' +
        'f 534/583/42 15/15/42 538/587/42 1523/1622/42\n' +
        'f 1523/1622/43 538/587/43 17/17/43 539/588/43\n' +
        'f 523/572/44 1523/1622/44 539/588/44 7/7/44\n' +
        'f 18/18/45 541/590/45 1524/1623/45 540/589/45\n' +
        'f 541/590/46 16/16/46 535/584/46 1524/1623/46\n' +
        'f 1524/1623/47 535/584/47 10/10/47 526/575/47\n' +
        'f 540/589/48 1524/1623/48 526/575/48 8/8/48\n' +
        'f 15/15/49 542/591/49 1525/1624/49 538/587/49\n' +
        'f 542/591/50 21/21/50 543/592/50 1525/1624/50\n' +
        'f 1525/1624/51 543/592/51 19/19/51 544/593/51\n' +
        'f 538/587/52 1525/1624/52 544/593/52 17/17/52\n' +
        'f 20/20/53 546/595/53 1526/1625/53 545/594/53\n' +
        'f 546/595/54 22/22/54 547/596/54 1526/1625/54\n' +
        'f 1526/1625/55 547/596/55 16/16/55 541/590/55\n' +
        'f 545/594/56 1526/1625/56 541/590/56 18/18/56\n' +
        'f 13/13/57 548/597/57 1527/1626/57 533/582/57\n' +
        'f 548/597/58 23/23/58 549/598/58 1527/1626/58\n' +
        'f 1527/1626/59 549/598/59 21/21/59 542/591/59\n' +
        'f 533/582/60 1527/1626/60 542/591/60 15/15/60\n' +
        'f 22/22/61 550/599/61 1528/1627/61 547/596/61\n' +
        'f 550/599/62 24/24/62 551/600/62 1528/1627/62\n' +
        'f 1528/1627/63 551/600/63 14/14/63 536/585/63\n' +
        'f 547/596/64 1528/1627/64 536/585/64 16/16/64\n' +
        'f 23/23/65 552/601/65 1529/1628/65 549/598/65\n' +
        'f 552/601/66 25/25/66 553/602/66 1529/1628/66\n' +
        'f 1529/1628/67 553/602/67 27/27/67 554/603/67\n' +
        'f 549/598/68 1529/1628/68 554/603/68 21/21/68\n' +
        'f 28/28/69 556/605/69 1530/1629/69 555/604/69\n' +
        'f 556/605/70 26/26/70 557/606/70 1530/1629/70\n' +
        'f 1530/1629/71 557/606/71 24/24/71 550/599/71\n' +
        'f 555/604/72 1530/1629/72 550/599/72 22/22/72\n' +
        'f 21/21/73 554/603/73 1531/1630/73 543/592/73\n' +
        'f 554/603/74 27/27/74 558/607/74 1531/1630/74\n' +
        'f 1531/1630/75 558/607/75 29/29/75 559/608/75\n' +
        'f 543/592/76 1531/1630/76 559/608/76 19/19/76\n' +
        'f 30/30/77 561/610/77 1532/1631/77 560/609/77\n' +
        'f 561/610/78 28/28/78 555/604/78 1532/1631/78\n' +
        'f 1532/1631/79 555/604/79 22/22/79 546/595/79\n' +
        'f 560/609/80 1532/1631/80 546/595/80 20/20/80\n' +
        'f 27/27/81 562/611/81 1533/1632/81 558/607/81\n' +
        'f 562/611/82 33/33/82 563/612/82 1533/1632/82\n' +
        'f 1533/1632/83 563/612/83 31/31/83 564/613/83\n' +
        'f 558/607/84 1533/1632/84 564/613/84 29/29/84\n' +
        'f 32/32/85 566/615/85 1534/1633/85 565/614/85\n' +
        'f 566/615/86 34/34/86 567/616/86 1534/1633/86\n' +
        'f 1534/1633/87 567/616/87 28/28/87 561/610/87\n' +
        'f 565/614/88 1534/1633/88 561/610/88 30/30/88\n' +
        'f 25/25/89 568/617/89 1535/1634/89 553/602/89\n' +
        'f 568/617/90 35/35/90 569/618/90 1535/1634/90\n' +
        'f 1535/1634/91 569/618/91 33/33/91 562/611/91\n' +
        'f 553/602/92 1535/1634/92 562/611/92 27/27/92\n' +
        'f 34/34/93 570/619/93 1536/1635/93 567/616/93\n' +
        'f 570/619/94 36/36/94 571/620/94 1536/1635/94\n' +
        'f 1536/1635/95 571/620/95 26/26/95 556/605/95\n' +
        'f 567/616/96 1536/1635/96 556/605/96 28/28/96\n' +
        'f 35/35/97 572/621/97 1537/1636/97 569/618/97\n' +
        'f 572/621/98 37/37/98 573/622/98 1537/1636/98\n' +
        'f 1537/1636/99 573/622/99 39/39/99 574/623/99\n' +
        'f 569/618/100 1537/1636/100 574/623/100 33/33/100\n' +
        'f 40/40/101 576/625/101 1538/1637/101 575/624/101\n' +
        'f 576/625/102 38/38/102 577/626/102 1538/1637/102\n' +
        'f 1538/1637/103 577/626/103 36/36/103 570/619/103\n' +
        'f 575/624/104 1538/1637/104 570/619/104 34/34/104\n' +
        'f 33/33/105 574/623/105 1539/1638/105 563/612/105\n' +
        'f 574/623/106 39/39/106 578/627/106 1539/1638/106\n' +
        'f 1539/1638/107 578/627/107 41/41/107 579/628/107\n' +
        'f 563/612/108 1539/1638/108 579/628/108 31/31/108\n' +
        'f 42/42/109 581/630/109 1540/1639/109 580/629/109\n' +
        'f 581/630/110 40/40/110 575/624/110 1540/1639/110\n' +
        'f 1540/1639/111 575/624/111 34/34/111 566/615/111\n' +
        'f 580/629/112 1540/1639/112 566/615/112 32/32/112\n' +
        'f 39/39/113 582/631/113 1541/1640/113 578/627/113\n' +
        'f 582/631/114 45/45/114 516/565/114 1541/1640/114\n' +
        'f 1541/1640/115 516/565/115 43/43/115 583/632/115\n' +
        'f 578/627/116 1541/1640/116 583/632/116 41/41/116\n' +
        'f 44/44/117 521/570/117 1542/1641/117 584/633/117\n' +
        'f 521/570/118 46/46/118 585/634/118 1542/1641/118\n' +
        'f 1542/1641/119 585/634/119 40/40/119 581/630/119\n' +
        'f 584/633/120 1542/1641/120 581/630/120 42/42/120\n' +
        'f 37/37/121 586/635/121 1543/1642/121 573/622/121\n' +
        'f 586/635/122 47/47/122 508/557/122 1543/1642/122\n' +
        'f 1543/1642/123 508/557/123 45/45/123 582/631/123\n' +
        'f 573/622/124 1543/1642/124 582/631/124 39/39/124\n' +
        'f 46/46/125 515/564/125 1544/1643/125 585/634/125\n' +
        'f 515/564/126 48/48/126 587/636/126 1544/1643/126\n' +
        'f 1544/1643/127 587/636/127 38/38/127 576/625/127\n' +
        'f 585/634/128 1544/1643/128 576/625/128 40/40/128\n' +
        'f 47/47/129 586/635/129 1545/1644/129 588/637/129\n' +
        'f 586/635/130 37/37/130 589/638/130 1545/1644/130\n' +
        'f 1545/1644/131 589/638/131 51/51/131 590/639/131\n' +
        'f 588/637/132 1545/1644/132 590/639/132 49/49/132\n' +
        'f 52/52/133 592/641/133 1546/1645/133 591/640/133\n' +
        'f 592/641/134 38/38/134 587/636/134 1546/1645/134\n' +
        'f 1546/1645/135 587/636/135 48/48/135 593/642/135\n' +
        'f 591/640/136 1546/1645/136 593/642/136 50/50/136\n' +
        'f 37/37/137 572/621/137 1547/1646/137 589/638/137\n' +
        'f 572/621/138 35/35/138 594/643/138 1547/1646/138\n' +
        'f 1547/1646/139 594/643/139 53/53/139 595/644/139\n' +
        'f 589/638/140 1547/1646/140 595/644/140 51/51/140\n' +
        'f 54/54/141 597/646/141 1548/1647/141 596/645/141\n' +
        'f 597/646/142 36/36/142 577/626/142 1548/1647/142\n' +
        'f 1548/1647/143 577/626/143 38/38/143 592/641/143\n' +
        'f 596/645/144 1548/1647/144 592/641/144 52/52/144\n' +
        'f 35/35/145 568/617/145 1549/1648/145 594/643/145\n' +
        'f 568/617/146 25/25/146 598/647/146 1549/1648/146\n' +
        'f 1549/1648/147 598/647/147 55/55/147 599/648/147\n' +
        'f 594/643/148 1549/1648/148 599/648/148 53/53/148\n' +
        'f 56/56/149 601/650/149 1550/1649/149 600/649/149\n' +
        'f 601/650/150 26/26/150 571/620/150 1550/1649/150\n' +
        'f 1550/1649/151 571/620/151 36/36/151 597/646/151\n' +
        'f 600/649/152 1550/1649/152 597/646/152 54/54/152\n' +
        'f 25/25/153 552/601/153 1551/1650/153 598/647/153\n' +
        'f 552/601/154 23/23/154 602/651/154 1551/1650/154\n' +
        'f 1551/1650/155 602/651/155 57/57/155 603/652/155\n' +
        'f 598/647/156 1551/1650/156 603/652/156 55/55/156\n' +
        'f 58/58/157 605/654/157 1552/1651/157 604/653/157\n' +
        'f 605/654/158 24/24/158 557/606/158 1552/1651/158\n' +
        'f 1552/1651/159 557/606/159 26/26/159 601/650/159\n' +
        'f 604/653/160 1552/1651/160 601/650/160 56/56/160\n' +
        'f 23/23/161 548/597/161 1553/1652/161 602/651/161\n' +
        'f 548/597/162 13/13/162 606/655/162 1553/1652/162\n' +
        'f 1553/1652/163 606/655/163 59/59/163 607/656/163\n' +
        'f 602/651/164 1553/1652/164 607/656/164 57/57/164\n' +
        'f 60/60/165 609/658/165 1554/1653/165 608/657/165\n' +
        'f 609/658/166 14/14/166 551/600/166 1554/1653/166\n' +
        'f 1554/1653/167 551/600/167 24/24/167 605/654/167\n' +
        'f 608/657/168 1554/1653/168 605/654/168 58/58/168\n' +
        'f 13/13/169 532/581/169 1555/1654/169 606/655/169\n' +
        'f 532/581/170 11/11/170 610/659/170 1555/1654/170\n' +
        'f 1555/1654/171 610/659/171 63/63/171 611/660/171\n' +
        'f 606/655/172 1555/1654/172 611/660/172 59/59/172\n' +
        'f 64/64/173 613/662/173 1556/1655/173 612/661/173\n' +
        'f 613/662/174 12/12/174 537/586/174 1556/1655/174\n' +
        'f 1556/1655/175 537/586/175 14/14/175 609/658/175\n' +
        'f 612/661/176 1556/1655/176 609/658/176 60/60/176\n' +
        'f 11/11/177 528/577/177 1557/1656/177 610/659/177\n' +
        'f 528/577/178 1/1/178 614/663/178 1557/1656/178\n' +
        'f 1557/1656/179 614/663/179 65/65/179 615/664/179\n' +
        'f 610/659/180 1557/1656/180 615/664/180 63/63/180\n' +
        'f 66/66/181 617/666/181 1558/1657/181 616/665/181\n' +
        'f 617/666/182 2/2/182 531/580/182 1558/1657/182\n' +
        'f 1558/1657/183 531/580/183 12/12/183 613/662/183\n' +
        'f 616/665/184 1558/1657/184 613/662/184 64/64/184\n' +
        'f 1/1/185 509/558/185 1559/1658/185 614/663/185\n' +
        'f 509/558/186 47/47/186 588/637/186 1559/1658/186\n' +
        'f 1559/1658/187 588/637/187 49/49/187 618/667/187\n' +
        'f 614/663/188 1559/1658/188 618/667/188 65/65/188\n' +
        'f 50/50/189 593/642/189 1560/1659/189 619/668/189\n' +
        'f 593/642/190 48/48/190 514/563/190 1560/1659/190\n' +
        'f 1560/1659/191 514/563/191 2/2/191 617/666/191\n' +
        'f 619/668/192 1560/1659/192 617/666/192 66/66/192\n' +
        'f 61/61/193 621/670/193 1561/1660/193 620/669/193\n' +
        'f 65/65/194 618/667/194 1561/1660/194 621/670/194\n' +
        'f 49/49/195 620/669/195 1561/1660/195 618/667/195\n' +
        'f 50/50/196 619/668/196 1562/1661/196 622/671/196\n' +
        'f 66/66/197 623/672/197 1562/1661/197 619/668/197\n' +
        'f 62/62/198 622/671/198 1562/1661/198 623/672/198\n' +
        'f 63/63/199 615/664/199 1563/1662/199 624/673/199\n' +
        'f 65/65/200 621/670/200 1563/1662/200 615/664/200\n' +
        'f 61/61/201 624/673/201 1563/1662/201 621/670/201\n' +
        'f 62/62/202 623/672/202 1564/1663/202 625/674/202\n' +
        'f 66/66/203 616/665/203 1564/1663/203 623/672/203\n' +
        'f 64/64/204 625/674/204 1564/1663/204 616/665/204\n' +
        'f 61/61/205 626/675/205 1565/1664/205 624/673/205\n' +
        'f 59/59/206 611/660/206 1565/1664/206 626/675/206\n' +
        'f 63/63/207 624/673/207 1565/1664/207 611/660/207\n' +
        'f 64/64/208 612/661/208 1566/1665/208 625/674/208\n' +
        'f 60/60/209 627/676/209 1566/1665/209 612/661/209\n' +
        'f 62/62/210 625/674/210 1566/1665/210 627/676/210\n' +
        'f 61/61/211 628/677/211 1567/1666/211 626/675/211\n' +
        'f 57/57/212 607/656/212 1567/1666/212 628/677/212\n' +
        'f 59/59/213 626/675/213 1567/1666/213 607/656/213\n' +
        'f 60/60/214 608/657/214 1568/1667/214 627/676/214\n' +
        'f 58/58/215 629/678/215 1568/1667/215 608/657/215\n' +
        'f 62/62/216 627/676/216 1568/1667/216 629/678/216\n' +
        'f 61/61/217 630/679/217 1569/1668/217 628/677/217\n' +
        'f 55/55/218 603/652/218 1569/1668/218 630/679/218\n' +
        'f 57/57/219 628/677/219 1569/1668/219 603/652/219\n' +
        'f 58/58/220 604/653/220 1570/1669/220 629/678/220\n' +
        'f 56/56/221 631/680/221 1570/1669/221 604/653/221\n' +
        'f 62/62/222 629/678/222 1570/1669/222 631/680/222\n' +
        'f 61/61/223 632/681/223 1571/1670/223 630/679/223\n' +
        'f 53/53/224 599/648/224 1571/1670/224 632/681/224\n' +
        'f 55/55/225 630/679/225 1571/1670/225 599/648/225\n' +
        'f 56/56/226 600/649/226 1572/1671/226 631/680/226\n' +
        'f 54/54/227 633/682/227 1572/1671/227 600/649/227\n' +
        'f 62/62/228 631/680/228 1572/1671/228 633/682/228\n' +
        'f 61/61/229 634/683/229 1573/1672/229 632/681/229\n' +
        'f 51/51/230 595/644/230 1573/1672/230 634/683/230\n' +
        'f 53/53/231 632/681/231 1573/1672/231 595/644/231\n' +
        'f 54/54/232 596/645/232 1574/1673/232 633/682/232\n' +
        'f 52/52/233 635/684/233 1574/1673/233 596/645/233\n' +
        'f 62/62/234 633/682/234 1574/1673/234 635/684/234\n' +
        'f 61/61/235 620/669/235 1575/1674/235 634/683/235\n' +
        'f 49/49/236 590/639/236 1575/1674/236 620/669/236\n' +
        'f 51/51/237 634/683/237 1575/1674/237 590/639/237\n' +
        'f 52/52/238 591/640/238 1576/1675/238 635/684/238\n' +
        'f 50/50/239 622/671/239 1576/1675/239 591/640/239\n' +
        'f 62/62/240 635/684/240 1576/1675/240 622/671/240\n' +
        'f 89/96/241 637/686/241 1577/1676/241 636/685/241\n' +
        'f 637/686/242 174/181/242 638/687/242 1577/1676/242\n' +
        'f 1577/1676/243 638/687/243 176/183/243 639/688/243\n' +
        'f 636/685/244 1577/1676/244 639/688/244 91/98/244\n' +
        'f 176/183/245 640/689/245 1578/1677/245 639/688/245\n' +
        'f 640/689/246 175/182/246 641/690/246 1578/1677/246\n' +
        'f 1578/1677/247 641/690/247 90/97/247 642/691/247\n' +
        'f 639/688/248 1578/1677/248 642/691/248 91/98/248\n' +
        'f 87/94/249 644/693/249 1579/1678/249 643/692/249\n' +
        'f 644/693/250 172/179/250 645/694/250 1579/1678/250\n' +
        'f 1579/1678/251 645/694/251 174/181/251 637/686/251\n' +
        'f 643/692/252 1579/1678/252 637/686/252 89/96/252\n' +
        'f 175/182/253 646/695/253 1580/1679/253 641/690/253\n' +
        'f 646/695/254 173/180/254 647/696/254 1580/1679/254\n' +
        'f 1580/1679/255 647/696/255 88/95/255 648/697/255\n' +
        'f 641/690/256 1580/1679/256 648/697/256 90/97/256\n' +
        'f 85/92/257 650/699/257 1581/1680/257 649/698/257\n' +
        'f 650/699/258 170/177/258 651/700/258 1581/1680/258\n' +
        'f 1581/1680/259 651/700/259 172/179/259 644/693/259\n' +
        'f 649/698/260 1581/1680/260 644/693/260 87/94/260\n' +
        'f 173/180/261 652/701/261 1582/1681/261 647/696/261\n' +
        'f 652/701/262 171/178/262 653/702/262 1582/1681/262\n' +
        'f 1582/1681/263 653/702/263 86/93/263 654/703/263\n' +
        'f 647/696/264 1582/1681/264 654/703/264 88/95/264\n' +
        'f 83/90/265 656/705/265 1583/1682/265 655/704/265\n' +
        'f 656/705/266 168/175/266 657/706/266 1583/1682/266\n' +
        'f 1583/1682/267 657/706/267 170/177/267 650/699/267\n' +
        'f 655/704/268 1583/1682/268 650/699/268 85/92/268\n' +
        'f 171/178/269 658/707/269 1584/1683/269 653/702/269\n' +
        'f 658/707/270 169/176/270 659/708/270 1584/1683/270\n' +
        'f 1584/1683/271 659/708/271 84/91/271 660/709/271\n' +
        'f 653/702/272 1584/1683/272 660/709/272 86/93/272\n' +
        'f 81/88/273 662/711/273 1585/1684/273 661/710/273\n' +
        'f 662/711/274 166/173/274 663/712/274 1585/1684/274\n' +
        'f 1585/1684/275 663/712/275 168/175/275 656/705/275\n' +
        'f 661/710/276 1585/1684/276 656/705/276 83/90/276\n' +
        'f 169/176/277 664/713/277 1586/1685/277 659/708/277\n' +
        'f 664/713/278 167/174/278 665/714/278 1586/1685/278\n' +
        'f 1586/1685/279 665/714/279 82/89/279 666/715/279\n' +
        'f 659/708/280 1586/1685/280 666/715/280 84/91/280\n' +
        'f 79/86/281 668/717/281 1587/1686/281 667/716/281\n' +
        'f 668/717/282 92/99/282 669/718/282 1587/1686/282\n' +
        'f 1587/1686/283 669/718/283 146/153/283 670/719/283\n' +
        'f 667/716/284 1587/1686/284 670/719/284 164/171/284\n' +
        'f 147/154/285 672/721/285 1588/1687/285 671/720/285\n' +
        'f 672/721/286 93/100/286 673/722/286 1588/1687/286\n' +
        'f 1588/1687/287 673/722/287 80/87/287 674/723/287\n' +
        'f 671/720/288 1588/1687/288 674/723/288 165/172/288\n' +
        'f 92/99/289 675/724/289 1589/1688/289 669/718/289\n' +
        'f 675/724/290 94/101/290 676/725/290 1589/1688/290\n' +
        'f 1589/1688/291 676/725/291 148/155/291 677/726/291\n' +
        'f 669/718/292 1589/1688/292 677/726/292 146/153/292\n' +
        'f 149/156/293 679/728/293 1590/1689/293 678/727/293\n' +
        'f 679/728/294 95/102/294 680/729/294 1590/1689/294\n' +
        'f 1590/1689/295 680/729/295 93/100/295 672/721/295\n' +
        'f 678/727/296 1590/1689/296 672/721/296 147/154/296\n' +
        'f 94/101/297 681/730/297 1591/1690/297 676/725/297\n' +
        'f 681/730/298 96/103/298 682/731/298 1591/1690/298\n' +
        'f 1591/1690/299 682/731/299 150/157/299 683/732/299\n' +
        'f 676/725/300 1591/1690/300 683/732/300 148/155/300\n' +
        'f 151/158/301 685/734/301 1592/1691/301 684/733/301\n' +
        'f 685/734/302 97/104/302 686/735/302 1592/1691/302\n' +
        'f 1592/1691/303 686/735/303 95/102/303 679/728/303\n' +
        'f 684/733/304 1592/1691/304 679/728/304 149/156/304\n' +
        'f 96/103/305 687/736/305 1593/1692/305 682/731/305\n' +
        'f 687/736/306 98/105/306 688/737/306 1593/1692/306\n' +
        'f 1593/1692/307 688/737/307 152/159/307 689/738/307\n' +
        'f 682/731/308 1593/1692/308 689/738/308 150/157/308\n' +
        'f 153/160/309 691/740/309 1594/1693/309 690/739/309\n' +
        'f 691/740/310 99/106/310 692/741/310 1594/1693/310\n' +
        'f 1594/1693/311 692/741/311 97/104/311 685/734/311\n' +
        'f 690/739/312 1594/1693/312 685/734/312 151/158/312\n' +
        'f 98/105/313 693/742/313 1595/1694/313 688/737/313\n' +
        'f 693/742/314 100/107/314 694/743/314 1595/1694/314\n' +
        'f 1595/1694/315 694/743/315 154/161/315 695/744/315\n' +
        'f 688/737/316 1595/1694/316 695/744/316 152/159/316\n' +
        'f 155/162/317 697/746/317 1596/1695/317 696/745/317\n' +
        'f 697/746/318 101/108/318 698/747/318 1596/1695/318\n' +
        'f 1596/1695/319 698/747/319 99/106/319 691/740/319\n' +
        'f 696/745/320 1596/1695/320 691/740/320 153/160/320\n' +
        'f 100/107/321 699/748/321 1597/1696/321 694/743/321\n' +
        'f 699/748/322 102/109/322 700/749/322 1597/1696/322\n' +
        'f 1597/1696/323 700/749/323 156/163/323 701/750/323\n' +
        'f 694/743/324 1597/1696/324 701/750/324 154/161/324\n' +
        'f 157/164/325 703/752/325 1598/1697/325 702/751/325\n' +
        'f 703/752/326 103/110/326 704/753/326 1598/1697/326\n' +
        'f 1598/1697/327 704/753/327 101/108/327 697/746/327\n' +
        'f 702/751/328 1598/1697/328 697/746/328 155/162/328\n' +
        'f 102/109/329 705/754/329 1599/1698/329 700/749/329\n' +
        'f 705/754/330 104/111/330 706/755/330 1599/1698/330\n' +
        'f 1599/1698/331 706/755/331 158/165/331 707/756/331\n' +
        'f 700/749/332 1599/1698/332 707/756/332 156/163/332\n' +
        'f 159/166/333 709/758/333 1600/1699/333 708/757/333\n' +
        'f 709/758/334 105/112/334 710/759/334 1600/1699/334\n' +
        'f 1600/1699/335 710/759/335 103/110/335 703/752/335\n' +
        'f 708/757/336 1600/1699/336 703/752/336 157/164/336\n' +
        'f 104/111/337 711/760/337 1601/1700/337 706/755/337\n' +
        'f 711/760/338 106/113/338 712/761/338 1601/1700/338\n' +
        'f 1601/1700/339 712/761/339 160/167/339 713/762/339\n' +
        'f 706/755/340 1601/1700/340 713/762/340 158/165/340\n' +
        'f 161/168/341 715/764/341 1602/1701/341 714/763/341\n' +
        'f 715/764/342 107/114/342 716/765/342 1602/1701/342\n' +
        'f 1602/1701/343 716/765/343 105/112/343 709/758/343\n' +
        'f 714/763/344 1602/1701/344 709/758/344 159/166/344\n' +
        'f 106/113/345 717/766/345 1603/1702/345 712/761/345\n' +
        'f 717/766/346 108/115/346 718/767/346 1603/1702/346\n' +
        'f 1603/1702/347 718/767/347 162/169/347 719/768/347\n' +
        'f 712/761/348 1603/1702/348 719/768/348 160/167/348\n' +
        'f 163/170/349 721/770/349 1604/1703/349 720/769/349\n' +
        'f 721/770/350 109/116/350 722/771/350 1604/1703/350\n' +
        'f 1604/1703/351 722/771/351 107/114/351 715/764/351\n' +
        'f 720/769/352 1604/1703/352 715/764/352 161/168/352\n' +
        'f 108/115/353 723/772/353 1605/1704/353 718/767/353\n' +
        'f 723/772/354 67/67/354 724/773/354 1605/1704/354\n' +
        'f 1605/1704/355 724/773/355 68/68/355 725/774/355\n' +
        'f 718/767/356 1605/1704/356 725/774/356 162/169/356\n' +
        'f 68/68/357 724/773/357 1606/1705/357 726/775/357\n' +
        'f 724/773/358 67/67/358 727/776/358 1606/1705/358\n' +
        'f 1606/1705/359 727/776/359 109/116/359 721/770/359\n' +
        'f 726/775/360 1606/1705/360 721/770/360 163/170/360\n' +
        'f 110/117/361 729/778/361 1607/1706/361 728/777/361\n' +
        'f 729/778/362 128/135/362 730/779/362 1607/1706/362\n' +
        'f 1607/1706/363 730/779/363 160/167/363 719/768/363\n' +
        'f 728/777/364 1607/1706/364 719/768/364 162/169/364\n' +
        'f 161/168/365 731/780/365 1608/1707/365 720/769/365\n' +
        'f 731/780/366 129/136/366 732/781/366 1608/1707/366\n' +
        'f 1608/1707/367 732/781/367 111/118/367 733/782/367\n' +
        'f 720/769/368 1608/1707/368 733/782/368 163/170/368\n' +
        'f 128/135/369 734/783/369 1609/1708/369 730/779/369\n' +
        'f 734/783/370 179/186/370 735/784/370 1609/1708/370\n' +
        'f 1609/1708/371 735/784/371 158/165/371 713/762/371\n' +
        'f 730/779/372 1609/1708/372 713/762/372 160/167/372\n' +
        'f 159/166/373 736/785/373 1610/1709/373 714/763/373\n' +
        'f 736/785/374 180/187/374 737/786/374 1610/1709/374\n' +
        'f 1610/1709/375 737/786/375 129/136/375 731/780/375\n' +
        'f 714/763/376 1610/1709/376 731/780/376 161/168/376\n' +
        'f 126/133/377 739/788/377 1611/1710/377 738/787/377\n' +
        'f 739/788/378 156/163/378 707/756/378 1611/1710/378\n' +
        'f 1611/1710/379 707/756/379 158/165/379 735/784/379\n' +
        'f 738/787/380 1611/1710/380 735/784/380 179/186/380\n' +
        'f 159/166/381 708/757/381 1612/1711/381 736/785/381\n' +
        'f 708/757/382 157/164/382 740/789/382 1612/1711/382\n' +
        'f 1612/1711/383 740/789/383 127/134/383 741/790/383\n' +
        'f 736/785/384 1612/1711/384 741/790/384 180/187/384\n' +
        'f 124/131/385 743/792/385 1613/1712/385 742/791/385\n' +
        'f 743/792/386 154/161/386 701/750/386 1613/1712/386\n' +
        'f 1613/1712/387 701/750/387 156/163/387 739/788/387\n' +
        'f 742/791/388 1613/1712/388 739/788/388 126/133/388\n' +
        'f 157/164/389 702/751/389 1614/1713/389 740/789/389\n' +
        'f 702/751/390 155/162/390 744/793/390 1614/1713/390\n' +
        'f 1614/1713/391 744/793/391 125/132/391 745/794/391\n' +
        'f 740/789/392 1614/1713/392 745/794/392 127/134/392\n' +
        'f 122/129/393 747/796/393 1615/1714/393 746/795/393\n' +
        'f 747/796/394 152/159/394 695/744/394 1615/1714/394\n' +
        'f 1615/1714/395 695/744/395 154/161/395 743/792/395\n' +
        'f 746/795/396 1615/1714/396 743/792/396 124/131/396\n' +
        'f 155/162/397 696/745/397 1616/1715/397 744/793/397\n' +
        'f 696/745/398 153/160/398 748/797/398 1616/1715/398\n' +
        'f 1616/1715/399 748/797/399 123/130/399 749/798/399\n' +
        'f 744/793/400 1616/1715/400 749/798/400 125/132/400\n' +
        'f 120/127/401 751/800/401 1617/1716/401 750/799/401\n' +
        'f 751/800/402 150/157/402 689/738/402 1617/1716/402\n' +
        'f 1617/1716/403 689/738/403 152/159/403 747/796/403\n' +
        'f 750/799/404 1617/1716/404 747/796/404 122/129/404\n' +
        'f 153/160/405 690/739/405 1618/1717/405 748/797/405\n' +
        'f 690/739/406 151/158/406 752/801/406 1618/1717/406\n' +
        'f 1618/1717/407 752/801/407 121/128/407 753/802/407\n' +
        'f 748/797/408 1618/1717/408 753/802/408 123/130/408\n' +
        'f 118/125/409 755/804/409 1619/1718/409 754/803/409\n' +
        'f 755/804/410 148/155/410 683/732/410 1619/1718/410\n' +
        'f 1619/1718/411 683/732/411 150/157/411 751/800/411\n' +
        'f 754/803/412 1619/1718/412 751/800/412 120/127/412\n' +
        'f 151/158/413 684/733/413 1620/1719/413 752/801/413\n' +
        'f 684/733/414 149/156/414 756/805/414 1620/1719/414\n' +
        'f 1620/1719/415 756/805/415 119/126/415 757/806/415\n' +
        'f 752/801/416 1620/1719/416 757/806/416 121/128/416\n' +
        'f 116/123/417 759/808/417 1621/1720/417 758/807/417\n' +
        'f 759/808/418 146/153/418 677/726/418 1621/1720/418\n' +
        'f 1621/1720/419 677/726/419 148/155/419 755/804/419\n' +
        'f 758/807/420 1621/1720/420 755/804/420 118/125/420\n' +
        'f 149/156/421 678/727/421 1622/1721/421 756/805/421\n' +
        'f 678/727/422 147/154/422 760/809/422 1622/1721/422\n' +
        'f 1622/1721/423 760/809/423 117/124/423 761/810/423\n' +
        'f 756/805/424 1622/1721/424 761/810/424 119/126/424\n' +
        'f 114/121/425 763/812/425 1623/1722/425 762/811/425\n' +
        'f 763/812/426 164/171/426 670/719/426 1623/1722/426\n' +
        'f 1623/1722/427 670/719/427 146/153/427 759/808/427\n' +
        'f 762/811/428 1623/1722/428 759/808/428 116/123/428\n' +
        'f 147/154/429 671/720/429 1624/1723/429 760/809/429\n' +
        'f 671/720/430 165/172/430 764/813/430 1624/1723/430\n' +
        'f 1624/1723/431 764/813/431 115/122/431 765/814/431\n' +
        'f 760/809/432 1624/1723/432 765/814/432 117/124/432\n' +
        'f 114/121/433 766/815/433 1625/1724/433 763/812/433\n' +
        'f 766/815/434 181/188/434 767/816/434 1625/1724/434\n' +
        'f 1625/1724/435 767/816/435 177/184/435 768/817/435\n' +
        'f 763/812/436 1625/1724/436 768/817/436 164/171/436\n' +
        'f 177/184/437 770/819/437 1626/1725/437 769/818/437\n' +
        'f 770/819/438 182/189/438 771/820/438 1626/1725/438\n' +
        'f 1626/1725/439 771/820/439 115/122/439 764/813/439\n' +
        'f 769/818/440 1626/1725/440 764/813/440 165/172/440\n' +
        'f 110/117/441 728/777/441 1627/1726/441 772/821/441\n' +
        'f 728/777/442 162/169/442 725/774/442 1627/1726/442\n' +
        'f 1627/1726/443 725/774/443 68/68/443 773/822/443\n' +
        'f 772/821/444 1627/1726/444 773/822/444 112/119/444\n' +
        'f 68/68/445 726/775/445 1628/1727/445 774/823/445\n' +
        'f 726/775/446 163/170/446 733/782/446 1628/1727/446\n' +
        'f 1628/1727/447 733/782/447 111/118/447 775/824/447\n' +
        'f 774/823/448 1628/1727/448 775/824/448 113/120/448\n' +
        'f 112/119/449 773/822/449 1629/1728/449 776/825/449\n' +
        'f 773/822/450 68/68/450 777/826/450 1629/1728/450\n' +
        'f 1629/1728/451 777/826/451 178/185/451 778/827/451\n' +
        'f 776/825/452 1629/1728/452 778/827/452 183/190/452\n' +
        'f 178/185/453 777/826/453 1630/1729/453 779/828/453\n' +
        'f 777/826/454 68/68/454 774/823/454 1630/1729/454\n' +
        'f 1630/1729/455 774/823/455 113/120/455 780/829/455\n' +
        'f 779/828/456 1630/1729/456 780/829/456 184/191/456\n' +
        'f 177/184/457 767/816/457 1631/1730/457 781/830/457\n' +
        'f 767/816/458 181/188/458 782/831/458 1631/1730/458\n' +
        'f 1631/1730/459 782/831/459 183/190/459 778/827/459\n' +
        'f 781/830/460 1631/1730/460 778/827/460 178/185/460\n' +
        'f 184/191/461 783/832/461 1632/1731/461 779/828/461\n' +
        'f 783/832/462 182/189/462 770/819/462 1632/1731/462\n' +
        'f 1632/1731/463 770/819/463 177/184/463 781/830/463\n' +
        'f 779/828/464 1632/1731/464 781/830/464 178/185/464\n' +
        'f 135/142/465 785/834/465 1633/1732/465 784/833/465\n' +
        'f 785/834/466 137/144/466 786/835/466 1633/1732/466\n' +
        'f 1633/1732/467 786/835/467 176/183/467 638/687/467\n' +
        'f 784/833/468 1633/1732/468 638/687/468 174/181/468\n' +
        'f 176/183/469 786/835/469 1634/1733/469 640/689/469\n' +
        'f 786/835/470 137/144/470 787/836/470 1634/1733/470\n' +
        'f 1634/1733/471 787/836/471 136/143/471 788/837/471\n' +
        'f 640/689/472 1634/1733/472 788/837/472 175/182/472\n' +
        'f 133/140/473 790/839/473 1635/1734/473 789/838/473\n' +
        'f 790/839/474 135/142/474 784/833/474 1635/1734/474\n' +
        'f 1635/1734/475 784/833/475 174/181/475 645/694/475\n' +
        'f 789/838/476 1635/1734/476 645/694/476 172/179/476\n' +
        'f 175/182/477 788/837/477 1636/1735/477 646/695/477\n' +
        'f 788/837/478 136/143/478 791/840/478 1636/1735/478\n' +
        'f 1636/1735/479 791/840/479 134/141/479 792/841/479\n' +
        'f 646/695/480 1636/1735/480 792/841/480 173/180/480\n' +
        'f 131/138/481 794/843/481 1637/1736/481 793/842/481\n' +
        'f 794/843/482 133/140/482 789/838/482 1637/1736/482\n' +
        'f 1637/1736/483 789/838/483 172/179/483 651/700/483\n' +
        'f 793/842/484 1637/1736/484 651/700/484 170/177/484\n' +
        'f 173/180/485 792/841/485 1638/1737/485 652/701/485\n' +
        'f 792/841/486 134/141/486 795/844/486 1638/1737/486\n' +
        'f 1638/1737/487 795/844/487 132/139/487 796/845/487\n' +
        'f 652/701/488 1638/1737/488 796/845/488 171/178/488\n' +
        'f 166/173/489 797/846/489 1639/1738/489 663/712/489\n' +
        'f 797/846/490 187/194/490 798/847/490 1639/1738/490\n' +
        'f 1639/1738/491 798/847/491 185/192/491 799/848/491\n' +
        'f 663/712/492 1639/1738/492 799/848/492 168/175/492\n' +
        'f 186/193/493 801/850/493 1640/1739/493 800/849/493\n' +
        'f 801/850/494 188/195/494 802/851/494 1640/1739/494\n' +
        'f 1640/1739/495 802/851/495 167/174/495 664/713/495\n' +
        'f 800/849/496 1640/1739/496 664/713/496 169/176/496\n' +
        'f 131/138/497 793/842/497 1641/1740/497 803/852/497\n' +
        'f 793/842/498 170/177/498 657/706/498 1641/1740/498\n' +
        'f 1641/1740/499 657/706/499 168/175/499 799/848/499\n' +
        'f 803/852/500 1641/1740/500 799/848/500 185/192/500\n' +
        'f 169/176/501 658/707/501 1642/1741/501 800/849/501\n' +
        'f 658/707/502 171/178/502 796/845/502 1642/1741/502\n' +
        'f 1642/1741/503 796/845/503 132/139/503 804/853/503\n' +
        'f 800/849/504 1642/1741/504 804/853/504 186/193/504\n' +
        'f 144/151/505 806/855/505 1643/1742/505 805/854/505\n' +
        'f 806/855/506 190/197/506 807/856/506 1643/1742/506\n' +
        'f 1643/1742/507 807/856/507 189/196/507 808/857/507\n' +
        'f 805/854/508 1643/1742/508 808/857/508 187/194/508\n' +
        'f 189/196/509 807/856/509 1644/1743/509 809/858/509\n' +
        'f 807/856/510 190/197/510 810/859/510 1644/1743/510\n' +
        'f 1644/1743/511 810/859/511 145/152/511 811/860/511\n' +
        'f 809/858/512 1644/1743/512 811/860/512 188/195/512\n' +
        'f 185/192/513 798/847/513 1645/1744/513 812/861/513\n' +
        'f 798/847/514 187/194/514 808/857/514 1645/1744/514\n' +
        'f 1645/1744/515 808/857/515 189/196/515 813/862/515\n' +
        'f 812/861/516 1645/1744/516 813/862/516 69/69/516\n' +
        'f 189/196/517 809/858/517 1646/1745/517 813/862/517\n' +
        'f 809/858/518 188/195/518 801/850/518 1646/1745/518\n' +
        'f 1646/1745/519 801/850/519 186/193/519 814/863/519\n' +
        'f 813/862/520 1646/1745/520 814/863/520 69/69/520\n' +
        'f 130/137/521 816/865/521 1647/1746/521 815/864/521\n' +
        'f 816/865/522 131/138/522 803/852/522 1647/1746/522\n' +
        'f 1647/1746/523 803/852/523 185/192/523 812/861/523\n' +
        'f 815/864/524 1647/1746/524 812/861/524 69/69/524\n' +
        'f 186/193/525 804/853/525 1648/1747/525 814/863/525\n' +
        'f 804/853/526 132/139/526 817/866/526 1648/1747/526\n' +
        'f 1648/1747/527 817/866/527 130/137/527 815/864/527\n' +
        'f 814/863/528 1648/1747/528 815/864/528 69/69/528\n' +
        'f 142/149/529 819/868/529 1649/1748/529 818/867/529\n' +
        'f 819/868/530 193/200/530 820/869/530 1649/1748/530\n' +
        'f 1649/1748/531 820/869/531 191/198/531 821/870/531\n' +
        'f 818/867/532 1649/1748/532 821/870/532 144/151/532\n' +
        'f 192/199/533 823/872/533 1650/1749/533 822/871/533\n' +
        'f 823/872/534 194/201/534 824/873/534 1650/1749/534\n' +
        'f 1650/1749/535 824/873/535 143/150/535 825/874/535\n' +
        'f 822/871/536 1650/1749/536 825/874/536 145/152/536\n' +
        'f 140/147/537 827/876/537 1651/1750/537 826/875/537\n' +
        'f 827/876/538 195/202/538 828/877/538 1651/1750/538\n' +
        'f 1651/1750/539 828/877/539 193/200/539 819/868/539\n' +
        'f 826/875/540 1651/1750/540 819/868/540 142/149/540\n' +
        'f 194/201/541 829/878/541 1652/1751/541 824/873/541\n' +
        'f 829/878/542 196/203/542 830/879/542 1652/1751/542\n' +
        'f 1652/1751/543 830/879/543 141/148/543 831/880/543\n' +
        'f 824/873/544 1652/1751/544 831/880/544 143/150/544\n' +
        'f 139/146/545 833/882/545 1653/1752/545 832/881/545\n' +
        'f 833/882/546 197/204/546 834/883/546 1653/1752/546\n' +
        'f 1653/1752/547 834/883/547 195/202/547 827/876/547\n' +
        'f 832/881/548 1653/1752/548 827/876/548 140/147/548\n' +
        'f 196/203/549 835/884/549 1654/1753/549 830/879/549\n' +
        'f 835/884/550 198/205/550 836/885/550 1654/1753/550\n' +
        'f 1654/1753/551 836/885/551 139/146/551 837/886/551\n' +
        'f 830/879/552 1654/1753/552 837/886/552 141/148/552\n' +
        'f 138/145/553 839/888/553 1655/1754/553 838/887/553\n' +
        'f 839/888/554 71/71/554 840/889/554 1655/1754/554\n' +
        'f 1655/1754/555 840/889/555 197/204/555 833/882/555\n' +
        'f 838/887/556 1655/1754/556 833/882/556 139/146/556\n' +
        'f 198/205/557 841/890/557 1656/1755/557 836/885/557\n' +
        'f 841/890/558 71/71/558 839/888/558 1656/1755/558\n' +
        'f 1656/1755/559 839/888/559 138/145/559 838/887/559\n' +
        'f 836/885/560 1656/1755/560 838/887/560 139/146/560\n' +
        'f 190/197/561 806/855/561 1657/1756/561 842/891/561\n' +
        'f 806/855/562 144/151/562 821/870/562 1657/1756/562\n' +
        'f 1657/1756/563 821/870/563 191/198/563 843/892/563\n' +
        'f 842/891/564 1657/1756/564 843/892/564 70/70/564\n' +
        'f 192/199/565 822/871/565 1658/1757/565 844/893/565\n' +
        'f 822/871/566 145/152/566 810/859/566 1658/1757/566\n' +
        'f 1658/1757/567 810/859/567 190/197/567 842/891/567\n' +
        'f 844/893/568 1658/1757/568 842/891/568 70/70/568\n' +
        'f 70/70/569 843/892/569 1659/1758/569 845/894/569\n' +
        'f 843/892/570 191/198/570 846/895/570 1659/1758/570\n' +
        'f 1659/1758/571 846/895/571 206/213/571 847/896/571\n' +
        'f 845/894/572 1659/1758/572 847/896/572 208/215/572\n' +
        'f 207/214/573 849/898/573 1660/1759/573 848/897/573\n' +
        'f 849/898/574 192/199/574 844/893/574 1660/1759/574\n' +
        'f 1660/1759/575 844/893/575 70/70/575 845/894/575\n' +
        'f 848/897/576 1660/1759/576 845/894/576 208/215/576\n' +
        'f 71/71/577 850/899/577 1661/1760/577 840/889/577\n' +
        'f 850/899/578 199/206/578 851/900/578 1661/1760/578\n' +
        'f 1661/1760/579 851/900/579 200/207/579 852/901/579\n' +
        'f 840/889/580 1661/1760/580 852/901/580 197/204/580\n' +
        'f 201/208/581 854/903/581 1662/1761/581 853/902/581\n' +
        'f 854/903/582 199/206/582 850/899/582 1662/1761/582\n' +
        'f 1662/1761/583 850/899/583 71/71/583 841/890/583\n' +
        'f 853/902/584 1662/1761/584 841/890/584 198/205/584\n' +
        'f 197/204/585 852/901/585 1663/1762/585 834/883/585\n' +
        'f 852/901/586 200/207/586 855/904/586 1663/1762/586\n' +
        'f 1663/1762/587 855/904/587 202/209/587 856/905/587\n' +
        'f 834/883/588 1663/1762/588 856/905/588 195/202/588\n' +
        'f 203/210/589 858/907/589 1664/1763/589 857/906/589\n' +
        'f 858/907/590 201/208/590 853/902/590 1664/1763/590\n' +
        'f 1664/1763/591 853/902/591 198/205/591 835/884/591\n' +
        'f 857/906/592 1664/1763/592 835/884/592 196/203/592\n' +
        'f 195/202/593 856/905/593 1665/1764/593 828/877/593\n' +
        'f 856/905/594 202/209/594 859/908/594 1665/1764/594\n' +
        'f 1665/1764/595 859/908/595 204/211/595 860/909/595\n' +
        'f 828/877/596 1665/1764/596 860/909/596 193/200/596\n' +
        'f 205/212/597 862/911/597 1666/1765/597 861/910/597\n' +
        'f 862/911/598 203/210/598 857/906/598 1666/1765/598\n' +
        'f 1666/1765/599 857/906/599 196/203/599 829/878/599\n' +
        'f 861/910/600 1666/1765/600 829/878/600 194/201/600\n' +
        'f 193/200/601 860/909/601 1667/1766/601 820/869/601\n' +
        'f 860/909/602 204/211/602 863/912/602 1667/1766/602\n' +
        'f 1667/1766/603 863/912/603 206/213/603 846/895/603\n' +
        'f 820/869/604 1667/1766/604 846/895/604 191/198/604\n' +
        'f 207/214/605 864/913/605 1668/1767/605 849/898/605\n' +
        'f 864/913/606 205/212/606 861/910/606 1668/1767/606\n' +
        'f 1668/1767/607 861/910/607 194/201/607 823/872/607\n' +
        'f 849/898/608 1668/1767/608 823/872/608 192/199/608\n' +
        'f 199/206/609 865/914/609 1669/1768/609 851/900/609\n' +
        'f 865/914/610 204/211/610 859/908/610 1669/1768/610\n' +
        'f 1669/1768/611 859/908/611 202/209/611 855/904/611\n' +
        'f 851/900/612 1669/1768/612 855/904/612 200/207/612\n' +
        'f 203/210/613 862/911/613 1670/1769/613 858/907/613\n' +
        'f 862/911/614 205/212/614 866/915/614 1670/1769/614\n' +
        'f 1670/1769/615 866/915/615 199/206/615 854/903/615\n' +
        'f 858/907/616 1670/1769/616 854/903/616 201/208/616\n' +
        'f 199/206/617 867/916/617 1671/1770/617 865/914/617\n' +
        'f 867/916/618 208/215/618 847/896/618 1671/1770/618\n' +
        'f 1671/1770/619 847/896/619 206/213/619 863/912/619\n' +
        'f 865/914/620 1671/1770/620 863/912/620 204/211/620\n' +
        'f 207/214/621 848/897/621 1672/1771/621 864/913/621\n' +
        'f 848/897/622 208/215/622 867/916/622 1672/1771/622\n' +
        'f 1672/1771/623 867/916/623 199/206/623 866/915/623\n' +
        'f 864/913/624 1672/1771/624 866/915/624 205/212/624\n' +
        'f 139/146/625 832/881/625 1673/1772/625 868/917/625\n' +
        'f 832/881/626 140/147/626 869/918/626 1673/1772/626\n' +
        'f 1673/1772/627 869/918/627 164/171/627 768/817/627\n' +
        'f 868/917/628 1673/1772/628 768/817/628 177/184/628\n' +
        'f 165/172/629 870/919/629 1674/1773/629 769/818/629\n' +
        'f 870/919/630 141/148/630 837/886/630 1674/1773/630\n' +
        'f 1674/1773/631 837/886/631 139/146/631 868/917/631\n' +
        'f 769/818/632 1674/1773/632 868/917/632 177/184/632\n' +
        'f 140/147/633 826/875/633 1675/1774/633 869/918/633\n' +
        'f 826/875/634 142/149/634 871/920/634 1675/1774/634\n' +
        'f 1675/1774/635 871/920/635 211/218/635 872/921/635\n' +
        'f 869/918/636 1675/1774/636 872/921/636 164/171/636\n' +
        'f 212/219/637 874/923/637 1676/1775/637 873/922/637\n' +
        'f 874/923/638 143/150/638 831/880/638 1676/1775/638\n' +
        'f 1676/1775/639 831/880/639 141/148/639 870/919/639\n' +
        'f 873/922/640 1676/1775/640 870/919/640 165/172/640\n' +
        'f 142/149/641 818/867/641 1677/1776/641 871/920/641\n' +
        'f 818/867/642 144/151/642 875/924/642 1677/1776/642\n' +
        'f 1677/1776/643 875/924/643 213/220/643 876/925/643\n' +
        'f 871/920/644 1677/1776/644 876/925/644 211/218/644\n' +
        'f 214/221/645 878/927/645 1678/1777/645 877/926/645\n' +
        'f 878/927/646 145/152/646 825/874/646 1678/1777/646\n' +
        'f 1678/1777/647 825/874/647 143/150/647 874/923/647\n' +
        'f 877/926/648 1678/1777/648 874/923/648 212/219/648\n' +
        'f 144/151/649 805/854/649 1679/1778/649 875/924/649\n' +
        'f 805/854/650 187/194/650 797/846/650 1679/1778/650\n' +
        'f 1679/1778/651 797/846/651 166/173/651 879/928/651\n' +
        'f 875/924/652 1679/1778/652 879/928/652 213/220/652\n' +
        'f 167/174/653 802/851/653 1680/1779/653 880/929/653\n' +
        'f 802/851/654 188/195/654 811/860/654 1680/1779/654\n' +
        'f 1680/1779/655 811/860/655 145/152/655 878/927/655\n' +
        'f 880/929/656 1680/1779/656 878/927/656 214/221/656\n' +
        'f 81/88/657 881/930/657 1681/1780/657 662/711/657\n' +
        'f 881/930/658 209/216/658 882/931/658 1681/1780/658\n' +
        'f 1681/1780/659 882/931/659 213/220/659 879/928/659\n' +
        'f 662/711/660 1681/1780/660 879/928/660 166/173/660\n' +
        'f 214/221/661 883/932/661 1682/1781/661 880/929/661\n' +
        'f 883/932/662 210/217/662 884/933/662 1682/1781/662\n' +
        'f 1682/1781/663 884/933/663 82/89/663 665/714/663\n' +
        'f 880/929/664 1682/1781/664 665/714/664 167/174/664\n' +
        'f 209/216/665 885/934/665 1683/1782/665 882/931/665\n' +
        'f 885/934/666 215/222/666 886/935/666 1683/1782/666\n' +
        'f 1683/1782/667 886/935/667 211/218/667 876/925/667\n' +
        'f 882/931/668 1683/1782/668 876/925/668 213/220/668\n' +
        'f 212/219/669 887/936/669 1684/1783/669 877/926/669\n' +
        'f 887/936/670 216/223/670 888/937/670 1684/1783/670\n' +
        'f 1684/1783/671 888/937/671 210/217/671 883/932/671\n' +
        'f 877/926/672 1684/1783/672 883/932/672 214/221/672\n' +
        'f 79/86/673 667/716/673 1685/1784/673 889/938/673\n' +
        'f 667/716/674 164/171/674 872/921/674 1685/1784/674\n' +
        'f 1685/1784/675 872/921/675 211/218/675 886/935/675\n' +
        'f 889/938/676 1685/1784/676 886/935/676 215/222/676\n' +
        'f 212/219/677 873/922/677 1686/1785/677 887/936/677\n' +
        'f 873/922/678 165/172/678 674/723/678 1686/1785/678\n' +
        'f 1686/1785/679 674/723/679 80/87/679 890/939/679\n' +
        'f 887/936/680 1686/1785/680 890/939/680 216/223/680\n' +
        'f 131/138/681 816/865/681 1687/1786/681 891/940/681\n' +
        'f 816/865/682 130/137/682 892/941/682 1687/1786/682\n' +
        'f 1687/1786/683 892/941/683 72/72/683 893/942/683\n' +
        'f 891/940/684 1687/1786/684 893/942/684 222/229/684\n' +
        'f 72/72/685 892/941/685 1688/1787/685 894/943/685\n' +
        'f 892/941/686 130/137/686 817/866/686 1688/1787/686\n' +
        'f 1688/1787/687 817/866/687 132/139/687 895/944/687\n' +
        'f 894/943/688 1688/1787/688 895/944/688 223/230/688\n' +
        'f 133/140/689 794/843/689 1689/1788/689 896/945/689\n' +
        'f 794/843/690 131/138/690 891/940/690 1689/1788/690\n' +
        'f 1689/1788/691 891/940/691 222/229/691 897/946/691\n' +
        'f 896/945/692 1689/1788/692 897/946/692 220/227/692\n' +
        'f 223/230/693 895/944/693 1690/1789/693 898/947/693\n' +
        'f 895/944/694 132/139/694 795/844/694 1690/1789/694\n' +
        'f 1690/1789/695 795/844/695 134/141/695 899/948/695\n' +
        'f 898/947/696 1690/1789/696 899/948/696 221/228/696\n' +
        'f 135/142/697 790/839/697 1691/1790/697 900/949/697\n' +
        'f 790/839/698 133/140/698 896/945/698 1691/1790/698\n' +
        'f 1691/1790/699 896/945/699 220/227/699 901/950/699\n' +
        'f 900/949/700 1691/1790/700 901/950/700 218/225/700\n' +
        'f 221/228/701 899/948/701 1692/1791/701 902/951/701\n' +
        'f 899/948/702 134/141/702 791/840/702 1692/1791/702\n' +
        'f 1692/1791/703 791/840/703 136/143/703 903/952/703\n' +
        'f 902/951/704 1692/1791/704 903/952/704 219/226/704\n' +
        'f 137/144/705 785/834/705 1693/1792/705 904/953/705\n' +
        'f 785/834/706 135/142/706 900/949/706 1693/1792/706\n' +
        'f 1693/1792/707 900/949/707 218/225/707 905/954/707\n' +
        'f 904/953/708 1693/1792/708 905/954/708 217/224/708\n' +
        'f 219/226/709 903/952/709 1694/1793/709 906/955/709\n' +
        'f 903/952/710 136/143/710 787/836/710 1694/1793/710\n' +
        'f 1694/1793/711 787/836/711 137/144/711 904/953/711\n' +
        'f 906/955/712 1694/1793/712 904/953/712 217/224/712\n' +
        'f 217/224/713 905/954/713 1695/1794/713 907/956/713\n' +
        'f 905/954/714 218/225/714 908/957/714 1695/1794/714\n' +
        'f 1695/1794/715 908/957/715 229/236/715 909/958/715\n' +
        'f 907/956/716 1695/1794/716 909/958/716 231/238/716\n' +
        'f 230/237/717 911/960/717 1696/1795/717 910/959/717\n' +
        'f 911/960/718 219/226/718 906/955/718 1696/1795/718\n' +
        'f 1696/1795/719 906/955/719 217/224/719 907/956/719\n' +
        'f 910/959/720 1696/1795/720 907/956/720 231/238/720\n' +
        'f 218/225/721 901/950/721 1697/1796/721 908/957/721\n' +
        'f 901/950/722 220/227/722 912/961/722 1697/1796/722\n' +
        'f 1697/1796/723 912/961/723 227/234/723 913/962/723\n' +
        'f 908/957/724 1697/1796/724 913/962/724 229/236/724\n' +
        'f 228/235/725 915/964/725 1698/1797/725 914/963/725\n' +
        'f 915/964/726 221/228/726 902/951/726 1698/1797/726\n' +
        'f 1698/1797/727 902/951/727 219/226/727 911/960/727\n' +
        'f 914/963/728 1698/1797/728 911/960/728 230/237/728\n' +
        'f 220/227/729 897/946/729 1699/1798/729 912/961/729\n' +
        'f 897/946/730 222/229/730 916/965/730 1699/1798/730\n' +
        'f 1699/1798/731 916/965/731 225/232/731 917/966/731\n' +
        'f 912/961/732 1699/1798/732 917/966/732 227/234/732\n' +
        'f 226/233/733 919/968/733 1700/1799/733 918/967/733\n' +
        'f 919/968/734 223/230/734 898/947/734 1700/1799/734\n' +
        'f 1700/1799/735 898/947/735 221/228/735 915/964/735\n' +
        'f 918/967/736 1700/1799/736 915/964/736 228/235/736\n' +
        'f 222/229/737 893/942/737 1701/1800/737 916/965/737\n' +
        'f 893/942/738 72/72/738 920/969/738 1701/1800/738\n' +
        'f 1701/1800/739 920/969/739 224/231/739 921/970/739\n' +
        'f 916/965/740 1701/1800/740 921/970/740 225/232/740\n' +
        'f 224/231/741 920/969/741 1702/1801/741 922/971/741\n' +
        'f 920/969/742 72/72/742 894/943/742 1702/1801/742\n' +
        'f 1702/1801/743 894/943/743 223/230/743 919/968/743\n' +
        'f 922/971/744 1702/1801/744 919/968/744 226/233/744\n' +
        'f 224/231/745 923/972/745 1703/1802/745 921/970/745\n' +
        'f 923/972/746 231/238/746 909/958/746 1703/1802/746\n' +
        'f 1703/1802/747 909/958/747 229/236/747 924/973/747\n' +
        'f 921/970/748 1703/1802/748 924/973/748 225/232/748\n' +
        'f 230/237/749 910/959/749 1704/1803/749 925/974/749\n' +
        'f 910/959/750 231/238/750 923/972/750 1704/1803/750\n' +
        'f 1704/1803/751 923/972/751 224/231/751 922/971/751\n' +
        'f 925/974/752 1704/1803/752 922/971/752 226/233/752\n' +
        'f 225/232/753 924/973/753 1705/1804/753 917/966/753\n' +
        'f 229/236/754 913/962/754 1705/1804/754 924/973/754\n' +
        'f 227/234/755 917/966/755 1705/1804/755 913/962/755\n' +
        'f 228/235/756 914/963/756 1706/1805/756 918/967/756\n' +
        'f 230/237/757 925/974/757 1706/1805/757 914/963/757\n' +
        'f 226/233/758 918/967/758 1706/1805/758 925/974/758\n' +
        'f 183/190/759 782/831/759 1707/1806/759 926/975/759\n' +
        'f 782/831/760 181/188/760 927/976/760 1707/1806/760\n' +
        'f 1707/1806/761 927/976/761 234/241/761 928/977/761\n' +
        'f 926/975/762 1707/1806/762 928/977/762 232/239/762\n' +
        'f 235/242/763 930/979/763 1708/1807/763 929/978/763\n' +
        'f 930/979/764 182/189/764 783/832/764 1708/1807/764\n' +
        'f 1708/1807/765 783/832/765 184/191/765 931/980/765\n' +
        'f 929/978/766 1708/1807/766 931/980/766 233/240/766\n' +
        'f 112/119/767 776/825/767 1709/1808/767 932/981/767\n' +
        'f 776/825/768 183/190/768 926/975/768 1709/1808/768\n' +
        'f 1709/1808/769 926/975/769 232/239/769 933/982/769\n' +
        'f 932/981/770 1709/1808/770 933/982/770 254/261/770\n' +
        'f 233/240/771 931/980/771 1710/1809/771 934/983/771\n' +
        'f 931/980/772 184/191/772 780/829/772 1710/1809/772\n' +
        'f 1710/1809/773 780/829/773 113/120/773 935/984/773\n' +
        'f 934/983/774 1710/1809/774 935/984/774 255/262/774\n' +
        'f 110/117/775 772/821/775 1711/1810/775 936/985/775\n' +
        'f 772/821/776 112/119/776 932/981/776 1711/1810/776\n' +
        'f 1711/1810/777 932/981/777 254/261/777 937/986/777\n' +
        'f 936/985/778 1711/1810/778 937/986/778 256/263/778\n' +
        'f 255/262/779 935/984/779 1712/1811/779 938/987/779\n' +
        'f 935/984/780 113/120/780 775/824/780 1712/1811/780\n' +
        'f 1712/1811/781 775/824/781 111/118/781 939/988/781\n' +
        'f 938/987/782 1712/1811/782 939/988/782 257/264/782\n' +
        'f 181/188/783 766/815/783 1713/1812/783 927/976/783\n' +
        'f 766/815/784 114/121/784 940/989/784 1713/1812/784\n' +
        'f 1713/1812/785 940/989/785 252/259/785 941/990/785\n' +
        'f 927/976/786 1713/1812/786 941/990/786 234/241/786\n' +
        'f 253/260/787 943/992/787 1714/1813/787 942/991/787\n' +
        'f 943/992/788 115/122/788 771/820/788 1714/1813/788\n' +
        'f 1714/1813/789 771/820/789 182/189/789 930/979/789\n' +
        'f 942/991/790 1714/1813/790 930/979/790 235/242/790\n' +
        'f 114/121/791 762/811/791 1715/1814/791 940/989/791\n' +
        'f 762/811/792 116/123/792 944/993/792 1715/1814/792\n' +
        'f 1715/1814/793 944/993/793 250/257/793 945/994/793\n' +
        'f 940/989/794 1715/1814/794 945/994/794 252/259/794\n' +
        'f 251/258/795 947/996/795 1716/1815/795 946/995/795\n' +
        'f 947/996/796 117/124/796 765/814/796 1716/1815/796\n' +
        'f 1716/1815/797 765/814/797 115/122/797 943/992/797\n' +
        'f 946/995/798 1716/1815/798 943/992/798 253/260/798\n' +
        'f 116/123/799 758/807/799 1717/1816/799 944/993/799\n' +
        'f 758/807/800 118/125/800 948/997/800 1717/1816/800\n' +
        'f 1717/1816/801 948/997/801 248/255/801 949/998/801\n' +
        'f 944/993/802 1717/1816/802 949/998/802 250/257/802\n' +
        'f 249/256/803 951/1000/803 1718/1817/803 950/999/803\n' +
        'f 951/1000/804 119/126/804 761/810/804 1718/1817/804\n' +
        'f 1718/1817/805 761/810/805 117/124/805 947/996/805\n' +
        'f 950/999/806 1718/1817/806 947/996/806 251/258/806\n' +
        'f 118/125/807 754/803/807 1719/1818/807 948/997/807\n' +
        'f 754/803/808 120/127/808 952/1001/808 1719/1818/808\n' +
        'f 1719/1818/809 952/1001/809 246/253/809 953/1002/809\n' +
        'f 948/997/810 1719/1818/810 953/1002/810 248/255/810\n' +
        'f 247/254/811 955/1004/811 1720/1819/811 954/1003/811\n' +
        'f 955/1004/812 121/128/812 757/806/812 1720/1819/812\n' +
        'f 1720/1819/813 757/806/813 119/126/813 951/1000/813\n' +
        'f 954/1003/814 1720/1819/814 951/1000/814 249/256/814\n' +
        'f 120/127/815 750/799/815 1721/1820/815 952/1001/815\n' +
        'f 750/799/816 122/129/816 956/1005/816 1721/1820/816\n' +
        'f 1721/1820/817 956/1005/817 244/251/817 957/1006/817\n' +
        'f 952/1001/818 1721/1820/818 957/1006/818 246/253/818\n' +
        'f 245/252/819 959/1008/819 1722/1821/819 958/1007/819\n' +
        'f 959/1008/820 123/130/820 753/802/820 1722/1821/820\n' +
        'f 1722/1821/821 753/802/821 121/128/821 955/1004/821\n' +
        'f 958/1007/822 1722/1821/822 955/1004/822 247/254/822\n' +
        'f 122/129/823 746/795/823 1723/1822/823 956/1005/823\n' +
        'f 746/795/824 124/131/824 960/1009/824 1723/1822/824\n' +
        'f 1723/1822/825 960/1009/825 242/249/825 961/1010/825\n' +
        'f 956/1005/826 1723/1822/826 961/1010/826 244/251/826\n' +
        'f 243/250/827 963/1012/827 1724/1823/827 962/1011/827\n' +
        'f 963/1012/828 125/132/828 749/798/828 1724/1823/828\n' +
        'f 1724/1823/829 749/798/829 123/130/829 959/1008/829\n' +
        'f 962/1011/830 1724/1823/830 959/1008/830 245/252/830\n' +
        'f 124/131/831 742/791/831 1725/1824/831 960/1009/831\n' +
        'f 742/791/832 126/133/832 964/1013/832 1725/1824/832\n' +
        'f 1725/1824/833 964/1013/833 240/247/833 965/1014/833\n' +
        'f 960/1009/834 1725/1824/834 965/1014/834 242/249/834\n' +
        'f 241/248/835 967/1016/835 1726/1825/835 966/1015/835\n' +
        'f 967/1016/836 127/134/836 745/794/836 1726/1825/836\n' +
        'f 1726/1825/837 745/794/837 125/132/837 963/1012/837\n' +
        'f 966/1015/838 1726/1825/838 963/1012/838 243/250/838\n' +
        'f 126/133/839 738/787/839 1727/1826/839 964/1013/839\n' +
        'f 738/787/840 179/186/840 968/1017/840 1727/1826/840\n' +
        'f 1727/1826/841 968/1017/841 236/243/841 969/1018/841\n' +
        'f 964/1013/842 1727/1826/842 969/1018/842 240/247/842\n' +
        'f 237/244/843 971/1020/843 1728/1827/843 970/1019/843\n' +
        'f 971/1020/844 180/187/844 741/790/844 1728/1827/844\n' +
        'f 1728/1827/845 741/790/845 127/134/845 967/1016/845\n' +
        'f 970/1019/846 1728/1827/846 967/1016/846 241/248/846\n' +
        'f 179/186/847 734/783/847 1729/1828/847 968/1017/847\n' +
        'f 734/783/848 128/135/848 972/1021/848 1729/1828/848\n' +
        'f 1729/1828/849 972/1021/849 238/245/849 973/1022/849\n' +
        'f 968/1017/850 1729/1828/850 973/1022/850 236/243/850\n' +
        'f 239/246/851 975/1024/851 1730/1829/851 974/1023/851\n' +
        'f 975/1024/852 129/136/852 737/786/852 1730/1829/852\n' +
        'f 1730/1829/853 737/786/853 180/187/853 971/1020/853\n' +
        'f 974/1023/854 1730/1829/854 971/1020/854 237/244/854\n' +
        'f 128/135/855 729/778/855 1731/1830/855 972/1021/855\n' +
        'f 729/778/856 110/117/856 936/985/856 1731/1830/856\n' +
        'f 1731/1830/857 936/985/857 256/263/857 976/1025/857\n' +
        'f 972/1021/858 1731/1830/858 976/1025/858 238/245/858\n' +
        'f 257/264/859 939/988/859 1732/1831/859 977/1026/859\n' +
        'f 939/988/860 111/118/860 732/781/860 1732/1831/860\n' +
        'f 1732/1831/861 732/781/861 129/136/861 975/1024/861\n' +
        'f 977/1026/862 1732/1831/862 975/1024/862 239/246/862\n' +
        'f 238/245/863 976/1025/863 1733/1832/863 978/1027/863\n' +
        'f 976/1025/864 256/263/864 979/1028/864 1733/1832/864\n' +
        'f 1733/1832/865 979/1028/865 258/265/865 980/1029/865\n' +
        'f 978/1027/866 1733/1832/866 980/1029/866 276/283/866\n' +
        'f 259/266/867 982/1031/867 1734/1833/867 981/1030/867\n' +
        'f 982/1031/868 257/264/868 977/1026/868 1734/1833/868\n' +
        'f 1734/1833/869 977/1026/869 239/246/869 983/1032/869\n' +
        'f 981/1030/870 1734/1833/870 983/1032/870 277/284/870\n' +
        'f 236/243/871 973/1022/871 1735/1834/871 984/1033/871\n' +
        'f 973/1022/872 238/245/872 978/1027/872 1735/1834/872\n' +
        'f 1735/1834/873 978/1027/873 276/283/873 985/1034/873\n' +
        'f 984/1033/874 1735/1834/874 985/1034/874 278/285/874\n' +
        'f 277/284/875 983/1032/875 1736/1835/875 986/1035/875\n' +
        'f 983/1032/876 239/246/876 974/1023/876 1736/1835/876\n' +
        'f 1736/1835/877 974/1023/877 237/244/877 987/1036/877\n' +
        'f 986/1035/878 1736/1835/878 987/1036/878 279/286/878\n' +
        'f 240/247/879 969/1018/879 1737/1836/879 988/1037/879\n' +
        'f 969/1018/880 236/243/880 984/1033/880 1737/1836/880\n' +
        'f 1737/1836/881 984/1033/881 278/285/881 989/1038/881\n' +
        'f 988/1037/882 1737/1836/882 989/1038/882 274/281/882\n' +
        'f 279/286/883 987/1036/883 1738/1837/883 990/1039/883\n' +
        'f 987/1036/884 237/244/884 970/1019/884 1738/1837/884\n' +
        'f 1738/1837/885 970/1019/885 241/248/885 991/1040/885\n' +
        'f 990/1039/886 1738/1837/886 991/1040/886 275/282/886\n' +
        'f 242/249/887 965/1014/887 1739/1838/887 992/1041/887\n' +
        'f 965/1014/888 240/247/888 988/1037/888 1739/1838/888\n' +
        'f 1739/1838/889 988/1037/889 274/281/889 993/1042/889\n' +
        'f 992/1041/890 1739/1838/890 993/1042/890 272/279/890\n' +
        'f 275/282/891 991/1040/891 1740/1839/891 994/1043/891\n' +
        'f 991/1040/892 241/248/892 966/1015/892 1740/1839/892\n' +
        'f 1740/1839/893 966/1015/893 243/250/893 995/1044/893\n' +
        'f 994/1043/894 1740/1839/894 995/1044/894 273/280/894\n' +
        'f 244/251/895 961/1010/895 1741/1840/895 996/1045/895\n' +
        'f 961/1010/896 242/249/896 992/1041/896 1741/1840/896\n' +
        'f 1741/1840/897 992/1041/897 272/279/897 997/1046/897\n' +
        'f 996/1045/898 1741/1840/898 997/1046/898 270/277/898\n' +
        'f 273/280/899 995/1044/899 1742/1841/899 998/1047/899\n' +
        'f 995/1044/900 243/250/900 962/1011/900 1742/1841/900\n' +
        'f 1742/1841/901 962/1011/901 245/252/901 999/1048/901\n' +
        'f 998/1047/902 1742/1841/902 999/1048/902 271/278/902\n' +
        'f 246/253/903 957/1006/903 1743/1842/903 1000/1049/903\n' +
        'f 957/1006/904 244/251/904 996/1045/904 1743/1842/904\n' +
        'f 1743/1842/905 996/1045/905 270/277/905 1001/1050/905\n' +
        'f 1000/1049/906 1743/1842/906 1001/1050/906 268/275/906\n' +
        'f 271/278/907 999/1048/907 1744/1843/907 1002/1051/907\n' +
        'f 999/1048/908 245/252/908 958/1007/908 1744/1843/908\n' +
        'f 1744/1843/909 958/1007/909 247/254/909 1003/1052/909\n' +
        'f 1002/1051/910 1744/1843/910 1003/1052/910 269/276/910\n' +
        'f 248/255/911 953/1002/911 1745/1844/911 1004/1053/911\n' +
        'f 953/1002/912 246/253/912 1000/1049/912 1745/1844/912\n' +
        'f 1745/1844/913 1000/1049/913 268/275/913 1005/1054/913\n' +
        'f 1004/1053/914 1745/1844/914 1005/1054/914 266/273/914\n' +
        'f 269/276/915 1003/1052/915 1746/1845/915 1006/1055/915\n' +
        'f 1003/1052/916 247/254/916 954/1003/916 1746/1845/916\n' +
        'f 1746/1845/917 954/1003/917 249/256/917 1007/1056/917\n' +
        'f 1006/1055/918 1746/1845/918 1007/1056/918 267/274/918\n' +
        'f 250/257/919 949/998/919 1747/1846/919 1008/1057/919\n' +
        'f 949/998/920 248/255/920 1004/1053/920 1747/1846/920\n' +
        'f 1747/1846/921 1004/1053/921 266/273/921 1009/1058/921\n' +
        'f 1008/1057/922 1747/1846/922 1009/1058/922 264/271/922\n' +
        'f 267/274/923 1007/1056/923 1748/1847/923 1010/1059/923\n' +
        'f 1007/1056/924 249/256/924 950/999/924 1748/1847/924\n' +
        'f 1748/1847/925 950/999/925 251/258/925 1011/1060/925\n' +
        'f 1010/1059/926 1748/1847/926 1011/1060/926 265/272/926\n' +
        'f 252/259/927 945/994/927 1749/1848/927 1012/1061/927\n' +
        'f 945/994/928 250/257/928 1008/1057/928 1749/1848/928\n' +
        'f 1749/1848/929 1008/1057/929 264/271/929 1013/1062/929\n' +
        'f 1012/1061/930 1749/1848/930 1013/1062/930 262/269/930\n' +
        'f 265/272/931 1011/1060/931 1750/1849/931 1014/1063/931\n' +
        'f 1011/1060/932 251/258/932 946/995/932 1750/1849/932\n' +
        'f 1750/1849/933 946/995/933 253/260/933 1015/1064/933\n' +
        'f 1014/1063/934 1750/1849/934 1015/1064/934 263/270/934\n' +
        'f 234/241/935 941/990/935 1751/1850/935 1016/1065/935\n' +
        'f 941/990/936 252/259/936 1012/1061/936 1751/1850/936\n' +
        'f 1751/1850/937 1012/1061/937 262/269/937 1017/1066/937\n' +
        'f 1016/1065/938 1751/1850/938 1017/1066/938 280/287/938\n' +
        'f 263/270/939 1015/1064/939 1752/1851/939 1018/1067/939\n' +
        'f 1015/1064/940 253/260/940 942/991/940 1752/1851/940\n' +
        'f 1752/1851/941 942/991/941 235/242/941 1019/1068/941\n' +
        'f 1018/1067/942 1752/1851/942 1019/1068/942 281/288/942\n' +
        'f 256/263/943 937/986/943 1753/1852/943 979/1028/943\n' +
        'f 937/986/944 254/261/944 1020/1069/944 1753/1852/944\n' +
        'f 1753/1852/945 1020/1069/945 260/267/945 1021/1070/945\n' +
        'f 979/1028/946 1753/1852/946 1021/1070/946 258/265/946\n' +
        'f 261/268/947 1023/1072/947 1754/1853/947 1022/1071/947\n' +
        'f 1023/1072/948 255/262/948 938/987/948 1754/1853/948\n' +
        'f 1754/1853/949 938/987/949 257/264/949 982/1031/949\n' +
        'f 1022/1071/950 1754/1853/950 982/1031/950 259/266/950\n' +
        'f 254/261/951 933/982/951 1755/1854/951 1020/1069/951\n' +
        'f 933/982/952 232/239/952 1024/1073/952 1755/1854/952\n' +
        'f 1755/1854/953 1024/1073/953 282/289/953 1025/1074/953\n' +
        'f 1020/1069/954 1755/1854/954 1025/1074/954 260/267/954\n' +
        'f 283/290/955 1027/1076/955 1756/1855/955 1026/1075/955\n' +
        'f 1027/1076/956 233/240/956 934/983/956 1756/1855/956\n' +
        'f 1756/1855/957 934/983/957 255/262/957 1023/1072/957\n' +
        'f 1026/1075/958 1756/1855/958 1023/1072/958 261/268/958\n' +
        'f 232/239/959 928/977/959 1757/1856/959 1024/1073/959\n' +
        'f 928/977/960 234/241/960 1016/1065/960 1757/1856/960\n' +
        'f 1757/1856/961 1016/1065/961 280/287/961 1028/1077/961\n' +
        'f 1024/1073/962 1757/1856/962 1028/1077/962 282/289/962\n' +
        'f 281/288/963 1019/1068/963 1758/1857/963 1029/1078/963\n' +
        'f 1019/1068/964 235/242/964 929/978/964 1758/1857/964\n' +
        'f 1758/1857/965 929/978/965 233/240/965 1027/1076/965\n' +
        'f 1029/1078/966 1758/1857/966 1027/1076/966 283/290/966\n' +
        'f 67/67/967 723/772/967 1759/1858/967 1030/1079/967\n' +
        'f 723/772/968 108/115/968 1031/1080/968 1759/1858/968\n' +
        'f 1759/1858/969 1031/1080/969 284/291/969 1032/1081/969\n' +
        'f 1030/1079/970 1759/1858/970 1032/1081/970 73/73/970\n' +
        'f 285/293/971 1034/1085/971 1760/1859/971 1033/1083/971\n' +
        'f 1034/1085/972 109/116/972 727/776/972 1760/1859/972\n' +
        'f 1760/1859/973 727/776/973 67/67/973 1030/1079/973\n' +
        'f 1033/1083/974 1760/1859/974 1030/1079/974 73/73/974\n' +
        'f 108/115/975 717/766/975 1761/1860/975 1031/1080/975\n' +
        'f 717/766/976 106/113/976 1035/1086/976 1761/1860/976\n' +
        'f 1761/1860/977 1035/1086/977 286/295/977 1036/1087/977\n' +
        'f 1031/1080/978 1761/1860/978 1036/1087/978 284/291/978\n' +
        'f 287/297/979 1038/1091/979 1762/1861/979 1037/1089/979\n' +
        'f 1038/1091/980 107/114/980 722/771/980 1762/1861/980\n' +
        'f 1762/1861/981 722/771/981 109/116/981 1034/1085/981\n' +
        'f 1037/1089/982 1762/1861/982 1034/1085/982 285/293/982\n' +
        'f 106/113/983 711/760/983 1763/1862/983 1035/1086/983\n' +
        'f 711/760/984 104/111/984 1039/1092/984 1763/1862/984\n' +
        'f 1763/1862/985 1039/1092/985 288/299/985 1040/1093/985\n' +
        'f 1035/1086/986 1763/1862/986 1040/1093/986 286/295/986\n' +
        'f 289/301/987 1042/1097/987 1764/1863/987 1041/1095/987\n' +
        'f 1042/1097/988 105/112/988 716/765/988 1764/1863/988\n' +
        'f 1764/1863/989 716/765/989 107/114/989 1038/1091/989\n' +
        'f 1041/1095/990 1764/1863/990 1038/1091/990 287/297/990\n' +
        'f 104/111/991 705/754/991 1765/1864/991 1039/1092/991\n' +
        'f 705/754/992 102/109/992 1043/1098/992 1765/1864/992\n' +
        'f 1765/1864/993 1043/1098/993 290/303/993 1044/1099/993\n' +
        'f 1039/1092/994 1765/1864/994 1044/1099/994 288/299/994\n' +
        'f 291/305/995 1046/1103/995 1766/1865/995 1045/1101/995\n' +
        'f 1046/1103/996 103/110/996 710/759/996 1766/1865/996\n' +
        'f 1766/1865/997 710/759/997 105/112/997 1042/1097/997\n' +
        'f 1045/1101/998 1766/1865/998 1042/1097/998 289/301/998\n' +
        'f 102/109/999 699/748/999 1767/1866/999 1043/1098/999\n' +
        'f 699/748/1000 100/107/1000 1047/1104/1000 1767/1866/1000\n' +
        'f 1767/1866/1001 1047/1104/1001 292/307/1001 1048/1105/1001\n' +
        'f 1043/1098/1002 1767/1866/1002 1048/1105/1002 290/303/1002\n' +
        'f 293/309/1003 1050/1109/1003 1768/1867/1003 1049/1107/1003\n' +
        'f 1050/1109/1004 101/108/1004 704/753/1004 1768/1867/1004\n' +
        'f 1768/1867/1005 704/753/1005 103/110/1005 1046/1103/1005\n' +
        'f 1049/1107/1006 1768/1867/1006 1046/1103/1006 291/305/1006\n' +
        'f 100/107/1007 693/742/1007 1769/1868/1007 1047/1104/1007\n' +
        'f 693/742/1008 98/105/1008 1051/1110/1008 1769/1868/1008\n' +
        'f 1769/1868/1009 1051/1110/1009 294/311/1009 1052/1111/1009\n' +
        'f 1047/1104/1010 1769/1868/1010 1052/1111/1010 292/307/1010\n' +
        'f 295/312/1011 1054/1115/1011 1770/1869/1011 1053/1113/1011\n' +
        'f 1054/1115/1012 99/106/1012 698/747/1012 1770/1869/1012\n' +
        'f 1770/1869/1013 698/747/1013 101/108/1013 1050/1109/1013\n' +
        'f 1053/1113/1014 1770/1869/1014 1050/1109/1014 293/309/1014\n' +
        'f 98/105/1015 687/736/1015 1771/1870/1015 1051/1110/1015\n' +
        'f 687/736/1016 96/103/1016 1055/1116/1016 1771/1870/1016\n' +
        'f 1771/1870/1017 1055/1116/1017 296/313/1017 1056/1117/1017\n' +
        'f 1051/1110/1018 1771/1870/1018 1056/1117/1018 294/311/1018\n' +
        'f 297/314/1019 1058/1119/1019 1772/1871/1019 1057/1118/1019\n' +
        'f 1058/1119/1020 97/104/1020 692/741/1020 1772/1871/1020\n' +
        'f 1772/1871/1021 692/741/1021 99/106/1021 1054/1115/1021\n' +
        'f 1057/1118/1022 1772/1871/1022 1054/1115/1022 295/312/1022\n' +
        'f 96/103/1023 681/730/1023 1773/1872/1023 1055/1116/1023\n' +
        'f 681/730/1024 94/101/1024 1059/1120/1024 1773/1872/1024\n' +
        'f 1773/1872/1025 1059/1120/1025 298/315/1025 1060/1121/1025\n' +
        'f 1055/1116/1026 1773/1872/1026 1060/1121/1026 296/313/1026\n' +
        'f 299/316/1027 1062/1123/1027 1774/1873/1027 1061/1122/1027\n' +
        'f 1062/1123/1028 95/102/1028 686/735/1028 1774/1873/1028\n' +
        'f 1774/1873/1029 686/735/1029 97/104/1029 1058/1119/1029\n' +
        'f 1061/1122/1030 1774/1873/1030 1058/1119/1030 297/314/1030\n' +
        'f 94/101/1031 675/724/1031 1775/1874/1031 1059/1120/1031\n' +
        'f 675/724/1032 92/99/1032 1063/1124/1032 1775/1874/1032\n' +
        'f 1775/1874/1033 1063/1124/1033 300/317/1033 1064/1125/1033\n' +
        'f 1059/1120/1034 1775/1874/1034 1064/1125/1034 298/315/1034\n' +
        'f 301/318/1035 1066/1127/1035 1776/1875/1035 1065/1126/1035\n' +
        'f 1066/1127/1036 93/100/1036 680/729/1036 1776/1875/1036\n' +
        'f 1776/1875/1037 680/729/1037 95/102/1037 1062/1123/1037\n' +
        'f 1065/1126/1038 1776/1875/1038 1062/1123/1038 299/316/1038\n' +
        'f 308/330/1039 1068/1129/1039 1777/1876/1039 1067/1128/1039\n' +
        'f 1068/1129/1040 309/332/1040 1069/1131/1040 1777/1876/1040\n' +
        'f 1777/1876/1041 1069/1131/1041 328/358/1041 1070/1132/1041\n' +
        'f 1067/1128/1042 1777/1876/1042 1070/1132/1042 338/368/1042\n' +
        'f 329/359/1043 1072/1134/1043 1778/1877/1043 1071/1133/1043\n' +
        'f 1072/1134/1044 309/333/1044 1068/1130/1044 1778/1877/1044\n' +
        'f 1778/1877/1045 1068/1130/1045 308/331/1045 1073/1135/1045\n' +
        'f 1071/1133/1046 1778/1877/1046 1073/1135/1046 339/369/1046\n' +
        'f 307/328/1047 1075/1137/1047 1779/1878/1047 1074/1136/1047\n' +
        'f 1075/1137/1048 308/330/1048 1067/1128/1048 1779/1878/1048\n' +
        'f 1779/1878/1049 1067/1128/1049 338/368/1049 1076/1139/1049\n' +
        'f 1074/1136/1050 1779/1878/1050 1076/1139/1050 336/366/1050\n' +
        'f 339/369/1051 1073/1135/1051 1780/1879/1051 1077/1140/1051\n' +
        'f 1073/1135/1052 308/331/1052 1075/1138/1052 1780/1879/1052\n' +
        'f 1780/1879/1053 1075/1138/1053 307/329/1053 1078/1141/1053\n' +
        'f 1077/1140/1054 1780/1879/1054 1078/1141/1054 337/367/1054\n' +
        'f 306/327/1055 1080/1143/1055 1781/1880/1055 1079/1142/1055\n' +
        'f 1080/1143/1056 307/328/1056 1074/1136/1056 1781/1880/1056\n' +
        'f 1781/1880/1057 1074/1136/1057 336/366/1057 1081/1145/1057\n' +
        'f 1079/1142/1058 1781/1880/1058 1081/1145/1058 340/370/1058\n' +
        'f 337/367/1059 1078/1141/1059 1782/1881/1059 1082/1146/1059\n' +
        'f 1078/1141/1060 307/329/1060 1080/1144/1060 1782/1881/1060\n' +
        'f 1782/1881/1061 1080/1144/1061 306/327/1061 1083/1147/1061\n' +
        'f 1082/1146/1062 1782/1881/1062 1083/1147/1062 341/371/1062\n' +
        'f 89/96/1063 636/685/1063 1783/1882/1063 1084/1148/1063\n' +
        'f 636/685/1064 91/98/1064 1085/1149/1064 1783/1882/1064\n' +
        'f 1783/1882/1065 1085/1149/1065 306/327/1065 1079/1142/1065\n' +
        'f 1084/1148/1066 1783/1882/1066 1079/1142/1066 340/370/1066\n' +
        'f 306/327/1067 1085/1149/1067 1784/1883/1067 1083/1147/1067\n' +
        'f 1085/1149/1068 91/98/1068 642/691/1068 1784/1883/1068\n' +
        'f 1784/1883/1069 642/691/1069 90/97/1069 1086/1150/1069\n' +
        'f 1083/1147/1070 1784/1883/1070 1086/1150/1070 341/371/1070\n' +
        'f 87/94/1071 643/692/1071 1785/1884/1071 1087/1151/1071\n' +
        'f 643/692/1072 89/96/1072 1084/1148/1072 1785/1884/1072\n' +
        'f 1785/1884/1073 1084/1148/1073 340/370/1073 1088/1152/1073\n' +
        'f 1087/1151/1074 1785/1884/1074 1088/1152/1074 334/364/1074\n' +
        'f 341/371/1075 1086/1150/1075 1786/1885/1075 1089/1153/1075\n' +
        'f 1086/1150/1076 90/97/1076 648/697/1076 1786/1885/1076\n' +
        'f 1786/1885/1077 648/697/1077 88/95/1077 1090/1154/1077\n' +
        'f 1089/1153/1078 1786/1885/1078 1090/1154/1078 335/365/1078\n' +
        'f 85/92/1079 649/698/1079 1787/1886/1079 1091/1155/1079\n' +
        'f 649/698/1080 87/94/1080 1087/1151/1080 1787/1886/1080\n' +
        'f 1787/1886/1081 1087/1151/1081 334/364/1081 1092/1156/1081\n' +
        'f 1091/1155/1082 1787/1886/1082 1092/1156/1082 330/360/1082\n' +
        'f 335/365/1083 1090/1154/1083 1788/1887/1083 1093/1157/1083\n' +
        'f 1090/1154/1084 88/95/1084 654/703/1084 1788/1887/1084\n' +
        'f 1788/1887/1085 654/703/1085 86/93/1085 1094/1158/1085\n' +
        'f 1093/1157/1086 1788/1887/1086 1094/1158/1086 331/361/1086\n' +
        'f 83/90/1087 655/704/1087 1789/1888/1087 1095/1159/1087\n' +
        'f 655/704/1088 85/92/1088 1091/1155/1088 1789/1888/1088\n' +
        'f 1789/1888/1089 1091/1155/1089 330/360/1089 1096/1160/1089\n' +
        'f 1095/1159/1090 1789/1888/1090 1096/1160/1090 332/362/1090\n' +
        'f 331/361/1091 1094/1158/1091 1790/1889/1091 1097/1161/1091\n' +
        'f 1094/1158/1092 86/93/1092 660/709/1092 1790/1889/1092\n' +
        'f 1790/1889/1093 660/709/1093 84/91/1093 1098/1162/1093\n' +
        'f 1097/1161/1094 1790/1889/1094 1098/1162/1094 333/363/1094\n' +
        'f 330/360/1095 1099/1163/1095 1791/1890/1095 1096/1160/1095\n' +
        'f 1099/1163/1096 336/366/1096 1076/1139/1096 1791/1890/1096\n' +
        'f 1791/1890/1097 1076/1139/1097 338/368/1097 1100/1164/1097\n' +
        'f 1096/1160/1098 1791/1890/1098 1100/1164/1098 332/362/1098\n' +
        'f 339/369/1099 1077/1140/1099 1792/1891/1099 1101/1165/1099\n' +
        'f 1077/1140/1100 337/367/1100 1102/1166/1100 1792/1891/1100\n' +
        'f 1792/1891/1101 1102/1166/1101 331/361/1101 1097/1161/1101\n' +
        'f 1101/1165/1102 1792/1891/1102 1097/1161/1102 333/363/1102\n' +
        'f 330/360/1103 1092/1156/1103 1793/1892/1103 1099/1163/1103\n' +
        'f 1092/1156/1104 334/364/1104 1088/1152/1104 1793/1892/1104\n' +
        'f 1793/1892/1105 1088/1152/1105 340/370/1105 1081/1145/1105\n' +
        'f 1099/1163/1106 1793/1892/1106 1081/1145/1106 336/366/1106\n' +
        'f 341/371/1107 1089/1153/1107 1794/1893/1107 1082/1146/1107\n' +
        'f 1089/1153/1108 335/365/1108 1093/1157/1108 1794/1893/1108\n' +
        'f 1794/1893/1109 1093/1157/1109 331/361/1109 1102/1166/1109\n' +
        'f 1082/1146/1110 1794/1893/1110 1102/1166/1110 337/367/1110\n' +
        'f 326/356/1111 1104/1168/1111 1795/1894/1111 1103/1167/1111\n' +
        'f 1104/1168/1112 332/362/1112 1100/1164/1112 1795/1894/1112\n' +
        'f 1795/1894/1113 1100/1164/1113 338/368/1113 1070/1132/1113\n' +
        'f 1103/1167/1114 1795/1894/1114 1070/1132/1114 328/358/1114\n' +
        'f 339/369/1115 1101/1165/1115 1796/1895/1115 1071/1133/1115\n' +
        'f 1101/1165/1116 333/363/1116 1105/1169/1116 1796/1895/1116\n' +
        'f 1796/1895/1117 1105/1169/1117 327/357/1117 1106/1170/1117\n' +
        'f 1071/1133/1118 1796/1895/1118 1106/1170/1118 329/359/1118\n' +
        'f 81/88/1119 661/710/1119 1797/1896/1119 1107/1171/1119\n' +
        'f 661/710/1120 83/90/1120 1095/1159/1120 1797/1896/1120\n' +
        'f 1797/1896/1121 1095/1159/1121 332/362/1121 1104/1168/1121\n' +
        'f 1107/1171/1122 1797/1896/1122 1104/1168/1122 326/356/1122\n' +
        'f 333/363/1123 1098/1162/1123 1798/1897/1123 1105/1169/1123\n' +
        'f 1098/1162/1124 84/91/1124 666/715/1124 1798/1897/1124\n' +
        'f 1798/1897/1125 666/715/1125 82/89/1125 1108/1172/1125\n' +
        'f 1105/1169/1126 1798/1897/1126 1108/1172/1126 327/357/1126\n' +
        'f 209/216/1127 1109/1173/1127 1799/1898/1127 885/934/1127\n' +
        'f 1109/1173/1128 342/372/1128 1110/1174/1128 1799/1898/1128\n' +
        'f 1799/1898/1129 1110/1174/1129 344/374/1129 1111/1175/1129\n' +
        'f 885/934/1130 1799/1898/1130 1111/1175/1130 215/222/1130\n' +
        'f 345/375/1131 1113/1177/1131 1800/1899/1131 1112/1176/1131\n' +
        'f 1113/1177/1132 343/373/1132 1114/1178/1132 1800/1899/1132\n' +
        'f 1800/1899/1133 1114/1178/1133 210/217/1133 888/937/1133\n' +
        'f 1112/1176/1134 1800/1899/1134 888/937/1134 216/223/1134\n' +
        'f 81/88/1135 1107/1171/1135 1801/1900/1135 881/930/1135\n' +
        'f 1107/1171/1136 326/356/1136 1115/1179/1136 1801/1900/1136\n' +
        'f 1801/1900/1137 1115/1179/1137 342/372/1137 1109/1173/1137\n' +
        'f 881/930/1138 1801/1900/1138 1109/1173/1138 209/216/1138\n' +
        'f 343/373/1139 1116/1180/1139 1802/1901/1139 1114/1178/1139\n' +
        'f 1116/1180/1140 327/357/1140 1108/1172/1140 1802/1901/1140\n' +
        'f 1802/1901/1141 1108/1172/1141 82/89/1141 884/933/1141\n' +
        'f 1114/1178/1142 1802/1901/1142 884/933/1142 210/217/1142\n' +
        'f 79/86/1143 889/938/1143 1803/1902/1143 1117/1181/1143\n' +
        'f 889/938/1144 215/222/1144 1111/1175/1144 1803/1902/1144\n' +
        'f 1803/1902/1145 1111/1175/1145 344/374/1145 1118/1182/1145\n' +
        'f 1117/1181/1146 1803/1902/1146 1118/1182/1146 346/376/1146\n' +
        'f 345/375/1147 1112/1176/1147 1804/1903/1147 1119/1183/1147\n' +
        'f 1112/1176/1148 216/223/1148 890/939/1148 1804/1903/1148\n' +
        'f 1804/1903/1149 890/939/1149 80/87/1149 1120/1184/1149\n' +
        'f 1119/1183/1150 1804/1903/1150 1120/1184/1150 347/377/1150\n' +
        'f 79/86/1151 1117/1181/1151 1805/1904/1151 668/717/1151\n' +
        'f 1117/1181/1152 346/376/1152 1121/1185/1152 1805/1904/1152\n' +
        'f 1805/1904/1153 1121/1185/1153 300/317/1153 1063/1124/1153\n' +
        'f 668/717/1154 1805/1904/1154 1063/1124/1154 92/99/1154\n' +
        'f 301/318/1155 1122/1186/1155 1806/1905/1155 1066/1127/1155\n' +
        'f 1122/1186/1156 347/377/1156 1120/1184/1156 1806/1905/1156\n' +
        'f 1806/1905/1157 1120/1184/1157 80/87/1157 673/722/1157\n' +
        'f 1066/1127/1158 1806/1905/1158 673/722/1158 93/100/1158\n' +
        'f 77/82/1159 1124/1189/1159 1807/1906/1159 1123/1187/1159\n' +
        'f 1124/1189/1160 324/354/1160 1125/1190/1160 1807/1906/1160\n' +
        'f 1807/1906/1161 1125/1190/1161 352/382/1161 1126/1191/1161\n' +
        'f 1123/1187/1162 1807/1906/1162 1126/1191/1162 304/323/1162\n' +
        'f 353/383/1163 1128/1193/1163 1808/1907/1163 1127/1192/1163\n' +
        'f 1128/1193/1164 325/355/1164 1129/1194/1164 1808/1907/1164\n' +
        'f 1808/1907/1165 1129/1194/1165 77/83/1165 1123/1188/1165\n' +
        'f 1127/1192/1166 1808/1907/1166 1123/1188/1166 304/324/1166\n' +
        'f 304/323/1167 1126/1191/1167 1809/1908/1167 1130/1195/1167\n' +
        'f 1126/1191/1168 352/382/1168 1131/1197/1168 1809/1908/1168\n' +
        'f 1809/1908/1169 1131/1197/1169 350/380/1169 1132/1198/1169\n' +
        'f 1130/1195/1170 1809/1908/1170 1132/1198/1170 78/84/1170\n' +
        'f 351/381/1171 1134/1200/1171 1810/1909/1171 1133/1199/1171\n' +
        'f 1134/1200/1172 353/383/1172 1127/1192/1172 1810/1909/1172\n' +
        'f 1810/1909/1173 1127/1192/1173 304/324/1173 1130/1196/1173\n' +
        'f 1133/1199/1174 1810/1909/1174 1130/1196/1174 78/85/1174\n' +
        'f 78/84/1175 1132/1198/1175 1811/1910/1175 1135/1201/1175\n' +
        'f 1132/1198/1176 350/380/1176 1136/1203/1176 1811/1910/1176\n' +
        'f 1811/1910/1177 1136/1203/1177 348/378/1177 1137/1204/1177\n' +
        'f 1135/1201/1178 1811/1910/1178 1137/1204/1178 305/325/1178\n' +
        'f 349/379/1179 1139/1206/1179 1812/1911/1179 1138/1205/1179\n' +
        'f 1139/1206/1180 351/381/1180 1133/1199/1180 1812/1911/1180\n' +
        'f 1812/1911/1181 1133/1199/1181 78/85/1181 1135/1202/1181\n' +
        'f 1138/1205/1182 1812/1911/1182 1135/1202/1182 305/326/1182\n' +
        'f 305/325/1183 1137/1204/1183 1813/1912/1183 1140/1207/1183\n' +
        'f 1137/1204/1184 348/378/1184 1141/1209/1184 1813/1912/1184\n' +
        'f 1813/1912/1185 1141/1209/1185 328/358/1185 1069/1131/1185\n' +
        'f 1140/1207/1186 1813/1912/1186 1069/1131/1186 309/332/1186\n' +
        'f 329/359/1187 1142/1210/1187 1814/1913/1187 1072/1134/1187\n' +
        'f 1142/1210/1188 349/379/1188 1138/1205/1188 1814/1913/1188\n' +
        'f 1814/1913/1189 1138/1205/1189 305/326/1189 1140/1208/1189\n' +
        'f 1072/1134/1190 1814/1913/1190 1140/1208/1190 309/333/1190\n' +
        'f 326/356/1191 1103/1167/1191 1815/1914/1191 1115/1179/1191\n' +
        'f 1103/1167/1192 328/358/1192 1141/1209/1192 1815/1914/1192\n' +
        'f 1815/1914/1193 1141/1209/1193 348/378/1193 1143/1211/1193\n' +
        'f 1115/1179/1194 1815/1914/1194 1143/1211/1194 342/372/1194\n' +
        'f 349/379/1195 1142/1210/1195 1816/1915/1195 1144/1212/1195\n' +
        'f 1142/1210/1196 329/359/1196 1106/1170/1196 1816/1915/1196\n' +
        'f 1816/1915/1197 1106/1170/1197 327/357/1197 1116/1180/1197\n' +
        'f 1144/1212/1198 1816/1915/1198 1116/1180/1198 343/373/1198\n' +
        'f 296/313/1199 1060/1121/1199 1817/1916/1199 1145/1213/1199\n' +
        'f 1060/1121/1200 298/315/1200 1146/1214/1200 1817/1916/1200\n' +
        'f 1817/1916/1201 1146/1214/1201 318/344/1201 1147/1215/1201\n' +
        'f 1145/1213/1202 1817/1916/1202 1147/1215/1202 310/334/1202\n' +
        'f 319/345/1203 1149/1217/1203 1818/1917/1203 1148/1216/1203\n' +
        'f 1149/1217/1204 299/316/1204 1061/1122/1204 1818/1917/1204\n' +
        'f 1818/1917/1205 1061/1122/1205 297/314/1205 1150/1218/1205\n' +
        'f 1148/1216/1206 1818/1917/1206 1150/1218/1206 311/335/1206\n' +
        'f 76/80/1207 1152/1221/1207 1819/1918/1207 1151/1219/1207\n' +
        'f 1152/1221/1208 316/342/1208 1153/1222/1208 1819/1918/1208\n' +
        'f 1819/1918/1209 1153/1222/1209 324/354/1209 1124/1189/1209\n' +
        'f 1151/1219/1210 1819/1918/1210 1124/1189/1210 77/82/1210\n' +
        'f 325/355/1211 1154/1223/1211 1820/1919/1211 1129/1194/1211\n' +
        'f 1154/1223/1212 317/343/1212 1155/1224/1212 1820/1919/1212\n' +
        'f 1820/1919/1213 1155/1224/1213 76/81/1213 1151/1220/1213\n' +
        'f 1129/1194/1214 1820/1919/1214 1151/1220/1214 77/83/1214\n' +
        'f 302/319/1215 1157/1227/1215 1821/1920/1215 1156/1225/1215\n' +
        'f 1157/1227/1216 358/388/1216 1158/1228/1216 1821/1920/1216\n' +
        'f 1821/1920/1217 1158/1228/1217 356/386/1217 1159/1229/1217\n' +
        'f 1156/1225/1218 1821/1920/1218 1159/1229/1218 303/321/1218\n' +
        'f 357/387/1219 1161/1231/1219 1822/1921/1219 1160/1230/1219\n' +
        'f 1161/1231/1220 359/389/1220 1162/1232/1220 1822/1921/1220\n' +
        'f 1822/1921/1221 1162/1232/1221 302/320/1221 1156/1226/1221\n' +
        'f 1160/1230/1222 1822/1921/1222 1156/1226/1222 303/322/1222\n' +
        'f 303/321/1223 1159/1229/1223 1823/1922/1223 1163/1233/1223\n' +
        'f 1159/1229/1224 356/386/1224 1164/1235/1224 1823/1922/1224\n' +
        'f 1823/1922/1225 1164/1235/1225 354/384/1225 1165/1236/1225\n' +
        'f 1163/1233/1226 1823/1922/1226 1165/1236/1226 75/78/1226\n' +
        'f 355/385/1227 1167/1238/1227 1824/1923/1227 1166/1237/1227\n' +
        'f 1167/1238/1228 357/387/1228 1160/1230/1228 1824/1923/1228\n' +
        'f 1824/1923/1229 1160/1230/1229 303/322/1229 1163/1234/1229\n' +
        'f 1166/1237/1230 1824/1923/1230 1163/1234/1230 75/79/1230\n' +
        'f 75/78/1231 1165/1236/1231 1825/1924/1231 1168/1239/1231\n' +
        'f 1165/1236/1232 354/384/1232 1169/1241/1232 1825/1924/1232\n' +
        'f 1825/1924/1233 1169/1241/1233 316/342/1233 1152/1221/1233\n' +
        'f 1168/1239/1234 1825/1924/1234 1152/1221/1234 76/80/1234\n' +
        'f 317/343/1235 1170/1242/1235 1826/1925/1235 1155/1224/1235\n' +
        'f 1170/1242/1236 355/385/1236 1166/1237/1236 1826/1925/1236\n' +
        'f 1826/1925/1237 1166/1237/1237 75/79/1237 1168/1240/1237\n' +
        'f 1155/1224/1238 1826/1925/1238 1168/1240/1238 76/81/1238\n' +
        'f 292/308/1239 1052/1112/1239 1827/1926/1239 1171/1243/1239\n' +
        'f 1052/1112/1240 294/311/1240 1172/1244/1240 1827/1926/1240\n' +
        'f 1827/1926/1241 1172/1244/1241 362/392/1241 1173/1245/1241\n' +
        'f 1171/1243/1242 1827/1926/1242 1173/1245/1242 364/394/1242\n' +
        'f 363/393/1243 1175/1247/1243 1828/1927/1243 1174/1246/1243\n' +
        'f 1175/1247/1244 295/312/1244 1053/1114/1244 1828/1927/1244\n' +
        'f 1828/1927/1245 1053/1114/1245 293/310/1245 1176/1248/1245\n' +
        'f 1174/1246/1246 1828/1927/1246 1176/1248/1246 365/395/1246\n' +
        'f 364/394/1247 1173/1245/1247 1829/1928/1247 1177/1249/1247\n' +
        'f 1173/1245/1248 362/392/1248 1178/1250/1248 1829/1928/1248\n' +
        'f 1829/1928/1249 1178/1250/1249 368/398/1249 1179/1251/1249\n' +
        'f 1177/1249/1250 1829/1928/1250 1179/1251/1250 366/396/1250\n' +
        'f 369/399/1251 1181/1253/1251 1830/1929/1251 1180/1252/1251\n' +
        'f 1181/1253/1252 363/393/1252 1174/1246/1252 1830/1929/1252\n' +
        'f 1830/1929/1253 1174/1246/1253 365/395/1253 1182/1254/1253\n' +
        'f 1180/1252/1254 1830/1929/1254 1182/1254/1254 367/397/1254\n' +
        'f 366/396/1255 1179/1251/1255 1831/1930/1255 1183/1255/1255\n' +
        'f 1179/1251/1256 368/398/1256 1184/1256/1256 1831/1930/1256\n' +
        'f 1831/1930/1257 1184/1256/1257 370/400/1257 1185/1257/1257\n' +
        'f 1183/1255/1258 1831/1930/1258 1185/1257/1258 372/402/1258\n' +
        'f 371/401/1259 1187/1259/1259 1832/1931/1259 1186/1258/1259\n' +
        'f 1187/1259/1260 369/399/1260 1180/1252/1260 1832/1931/1260\n' +
        'f 1832/1931/1261 1180/1252/1261 367/397/1261 1188/1260/1261\n' +
        'f 1186/1258/1262 1832/1931/1262 1188/1260/1262 373/403/1262\n' +
        'f 372/402/1263 1185/1257/1263 1833/1932/1263 1189/1261/1263\n' +
        'f 1185/1257/1264 370/400/1264 1190/1262/1264 1833/1932/1264\n' +
        'f 1833/1932/1265 1190/1262/1265 376/406/1265 1191/1263/1265\n' +
        'f 1189/1261/1266 1833/1932/1266 1191/1263/1266 374/404/1266\n' +
        'f 377/407/1267 1193/1265/1267 1834/1933/1267 1192/1264/1267\n' +
        'f 1193/1265/1268 371/401/1268 1186/1258/1268 1834/1933/1268\n' +
        'f 1834/1933/1269 1186/1258/1269 373/403/1269 1194/1266/1269\n' +
        'f 1192/1264/1270 1834/1933/1270 1194/1266/1270 375/405/1270\n' +
        'f 314/338/1271 1196/1268/1271 1835/1934/1271 1195/1267/1271\n' +
        'f 1196/1268/1272 378/408/1272 1197/1269/1272 1835/1934/1272\n' +
        'f 1835/1934/1273 1197/1269/1273 374/404/1273 1191/1263/1273\n' +
        'f 1195/1267/1274 1835/1934/1274 1191/1263/1274 376/406/1274\n' +
        'f 375/405/1275 1198/1270/1275 1836/1935/1275 1192/1264/1275\n' +
        'f 1198/1270/1276 379/409/1276 1199/1271/1276 1836/1935/1276\n' +
        'f 1836/1935/1277 1199/1271/1277 315/340/1277 1200/1272/1277\n' +
        'f 1192/1264/1278 1836/1935/1278 1200/1272/1278 377/407/1278\n' +
        'f 316/342/1279 1169/1241/1279 1837/1936/1279 1201/1273/1279\n' +
        'f 1169/1241/1280 354/384/1280 1202/1274/1280 1837/1936/1280\n' +
        'f 1837/1936/1281 1202/1274/1281 374/404/1281 1197/1269/1281\n' +
        'f 1201/1273/1282 1837/1936/1282 1197/1269/1282 378/408/1282\n' +
        'f 375/405/1283 1203/1275/1283 1838/1937/1283 1198/1270/1283\n' +
        'f 1203/1275/1284 355/385/1284 1170/1242/1284 1838/1937/1284\n' +
        'f 1838/1937/1285 1170/1242/1285 317/343/1285 1204/1276/1285\n' +
        'f 1198/1270/1286 1838/1937/1286 1204/1276/1286 379/409/1286\n' +
        'f 354/384/1287 1164/1235/1287 1839/1938/1287 1202/1274/1287\n' +
        'f 1164/1235/1288 356/386/1288 1205/1277/1288 1839/1938/1288\n' +
        'f 1839/1938/1289 1205/1277/1289 372/402/1289 1189/1261/1289\n' +
        'f 1202/1274/1290 1839/1938/1290 1189/1261/1290 374/404/1290\n' +
        'f 373/403/1291 1206/1278/1291 1840/1939/1291 1194/1266/1291\n' +
        'f 1206/1278/1292 357/387/1292 1167/1238/1292 1840/1939/1292\n' +
        'f 1840/1939/1293 1167/1238/1293 355/385/1293 1203/1275/1293\n' +
        'f 1194/1266/1294 1840/1939/1294 1203/1275/1294 375/405/1294\n' +
        'f 356/386/1295 1158/1228/1295 1841/1940/1295 1205/1277/1295\n' +
        'f 1158/1228/1296 358/388/1296 1207/1279/1296 1841/1940/1296\n' +
        'f 1841/1940/1297 1207/1279/1297 366/396/1297 1183/1255/1297\n' +
        'f 1205/1277/1298 1841/1940/1298 1183/1255/1298 372/402/1298\n' +
        'f 367/397/1299 1208/1280/1299 1842/1941/1299 1188/1260/1299\n' +
        'f 1208/1280/1300 359/389/1300 1161/1231/1300 1842/1941/1300\n' +
        'f 1842/1941/1301 1161/1231/1301 357/387/1301 1206/1278/1301\n' +
        'f 1188/1260/1302 1842/1941/1302 1206/1278/1302 373/403/1302\n' +
        'f 358/388/1303 1209/1281/1303 1843/1942/1303 1207/1279/1303\n' +
        'f 1209/1281/1304 360/390/1304 1210/1282/1304 1843/1942/1304\n' +
        'f 1843/1942/1305 1210/1282/1305 364/394/1305 1177/1249/1305\n' +
        'f 1207/1279/1306 1843/1942/1306 1177/1249/1306 366/396/1306\n' +
        'f 365/395/1307 1211/1283/1307 1844/1943/1307 1182/1254/1307\n' +
        'f 1211/1283/1308 361/391/1308 1212/1284/1308 1844/1943/1308\n' +
        'f 1844/1943/1309 1212/1284/1309 359/389/1309 1208/1280/1309\n' +
        'f 1182/1254/1310 1844/1943/1310 1208/1280/1310 367/397/1310\n' +
        'f 290/304/1311 1048/1106/1311 1845/1944/1311 1213/1285/1311\n' +
        'f 1048/1106/1312 292/308/1312 1171/1243/1312 1845/1944/1312\n' +
        'f 1845/1944/1313 1171/1243/1313 364/394/1313 1210/1282/1313\n' +
        'f 1213/1285/1314 1845/1944/1314 1210/1282/1314 360/390/1314\n' +
        'f 365/395/1315 1176/1248/1315 1846/1945/1315 1211/1283/1315\n' +
        'f 1176/1248/1316 293/310/1316 1049/1108/1316 1846/1945/1316\n' +
        'f 1846/1945/1317 1049/1108/1317 291/306/1317 1214/1286/1317\n' +
        'f 1211/1283/1318 1846/1945/1318 1214/1286/1318 361/391/1318\n' +
        'f 74/76/1319 1216/1289/1319 1847/1946/1319 1215/1287/1319\n' +
        'f 1216/1289/1320 360/390/1320 1209/1281/1320 1847/1946/1320\n' +
        'f 1847/1946/1321 1209/1281/1321 358/388/1321 1157/1227/1321\n' +
        'f 1215/1287/1322 1847/1946/1322 1157/1227/1322 302/319/1322\n' +
        'f 359/389/1323 1212/1284/1323 1848/1947/1323 1162/1232/1323\n' +
        'f 1212/1284/1324 361/391/1324 1217/1290/1324 1848/1947/1324\n' +
        'f 1848/1947/1325 1217/1290/1325 74/77/1325 1215/1288/1325\n' +
        'f 1162/1232/1326 1848/1947/1326 1215/1288/1326 302/320/1326\n' +
        'f 284/292/1327 1036/1088/1327 1849/1948/1327 1218/1291/1327\n' +
        'f 1036/1088/1328 286/296/1328 1040/1094/1328 1849/1948/1328\n' +
        'f 1849/1948/1329 1040/1094/1329 288/300/1329 1044/1100/1329\n' +
        'f 1218/1291/1330 1849/1948/1330 1044/1100/1330 290/304/1330\n' +
        'f 289/302/1331 1041/1096/1331 1850/1949/1331 1045/1102/1331\n' +
        'f 1041/1096/1332 287/298/1332 1037/1090/1332 1850/1949/1332\n' +
        'f 1850/1949/1333 1037/1090/1333 285/294/1333 1219/1292/1333\n' +
        'f 1045/1102/1334 1850/1949/1334 1219/1292/1334 291/306/1334\n' +
        'f 284/292/1335 1218/1291/1335 1851/1950/1335 1220/1293/1335\n' +
        'f 1218/1291/1336 290/304/1336 1213/1285/1336 1851/1950/1336\n' +
        'f 1851/1950/1337 1213/1285/1337 360/390/1337 1216/1289/1337\n' +
        'f 1220/1293/1338 1851/1950/1338 1216/1289/1338 74/76/1338\n' +
        'f 361/391/1339 1214/1286/1339 1852/1951/1339 1217/1290/1339\n' +
        'f 1214/1286/1340 291/306/1340 1219/1292/1340 1852/1951/1340\n' +
        'f 1852/1951/1341 1219/1292/1341 285/294/1341 1221/1294/1341\n' +
        'f 1217/1290/1342 1852/1951/1342 1221/1294/1342 74/77/1342\n' +
        'f 73/74/1343 1032/1082/1343 1853/1952/1343 1222/1295/1343\n' +
        'f 284/292/1344 1220/1293/1344 1853/1952/1344 1032/1082/1344\n' +
        'f 74/76/1345 1222/1295/1345 1853/1952/1345 1220/1293/1345\n' +
        'f 74/77/1346 1221/1294/1346 1854/1953/1346 1222/1296/1346\n' +
        'f 285/294/1347 1033/1084/1347 1854/1953/1347 1221/1294/1347\n' +
        'f 73/75/1348 1222/1296/1348 1854/1953/1348 1033/1084/1348\n' +
        'f 294/311/1349 1056/1117/1349 1855/1954/1349 1172/1244/1349\n' +
        'f 1056/1117/1350 296/313/1350 1145/1213/1350 1855/1954/1350\n' +
        'f 1855/1954/1351 1145/1213/1351 310/334/1351 1223/1297/1351\n' +
        'f 1172/1244/1352 1855/1954/1352 1223/1297/1352 362/392/1352\n' +
        'f 311/335/1353 1150/1218/1353 1856/1955/1353 1224/1298/1353\n' +
        'f 1150/1218/1354 297/314/1354 1057/1118/1354 1856/1955/1354\n' +
        'f 1856/1955/1355 1057/1118/1355 295/312/1355 1175/1247/1355\n' +
        'f 1224/1298/1356 1856/1955/1356 1175/1247/1356 363/393/1356\n' +
        'f 310/334/1357 1225/1299/1357 1857/1956/1357 1223/1297/1357\n' +
        'f 1225/1299/1358 312/336/1358 1226/1300/1358 1857/1956/1358\n' +
        'f 1857/1956/1359 1226/1300/1359 368/398/1359 1178/1250/1359\n' +
        'f 1223/1297/1360 1857/1956/1360 1178/1250/1360 362/392/1360\n' +
        'f 369/399/1361 1227/1301/1361 1858/1957/1361 1181/1253/1361\n' +
        'f 1227/1301/1362 313/337/1362 1228/1302/1362 1858/1957/1362\n' +
        'f 1858/1957/1363 1228/1302/1363 311/335/1363 1224/1298/1363\n' +
        'f 1181/1253/1364 1858/1957/1364 1224/1298/1364 363/393/1364\n' +
        'f 312/336/1365 1229/1303/1365 1859/1958/1365 1226/1300/1365\n' +
        'f 1229/1303/1366 382/413/1366 1230/1304/1366 1859/1958/1366\n' +
        'f 1859/1958/1367 1230/1304/1367 370/400/1367 1184/1256/1367\n' +
        'f 1226/1300/1368 1859/1958/1368 1184/1256/1368 368/398/1368\n' +
        'f 371/401/1369 1231/1305/1369 1860/1959/1369 1187/1259/1369\n' +
        'f 1231/1305/1370 383/415/1370 1232/1306/1370 1860/1959/1370\n' +
        'f 1860/1959/1371 1232/1306/1371 313/337/1371 1227/1301/1371\n' +
        'f 1187/1259/1372 1860/1959/1372 1227/1301/1372 369/399/1372\n' +
        'f 314/338/1373 1195/1267/1373 1861/1960/1373 1233/1307/1373\n' +
        'f 1195/1267/1374 376/406/1374 1190/1262/1374 1861/1960/1374\n' +
        'f 1861/1960/1375 1190/1262/1375 370/400/1375 1230/1304/1375\n' +
        'f 1233/1307/1376 1861/1960/1376 1230/1304/1376 382/413/1376\n' +
        'f 371/401/1377 1193/1265/1377 1862/1961/1377 1231/1305/1377\n' +
        'f 1193/1265/1378 377/407/1378 1200/1272/1378 1862/1961/1378\n' +
        'f 1862/1961/1379 1200/1272/1379 315/340/1379 1234/1308/1379\n' +
        'f 1231/1305/1380 1862/1961/1380 1234/1308/1380 383/415/1380\n' +
        'f 348/378/1381 1136/1203/1381 1863/1962/1381 1235/1310/1381\n' +
        'f 1136/1203/1382 350/380/1382 1236/1311/1382 1863/1962/1382\n' +
        'f 1863/1962/1383 1236/1311/1383 386/419/1383 1237/1312/1383\n' +
        'f 1235/1310/1384 1863/1962/1384 1237/1312/1384 384/417/1384\n' +
        'f 387/420/1385 1239/1314/1385 1864/1963/1385 1238/1313/1385\n' +
        'f 1239/1314/1386 351/381/1386 1139/1206/1386 1864/1963/1386\n' +
        'f 1864/1963/1387 1139/1206/1387 349/379/1387 1240/1315/1387\n' +
        'f 1238/1313/1388 1864/1963/1388 1240/1315/1388 385/418/1388\n' +
        'f 318/344/1389 1242/1317/1389 1865/1964/1389 1241/1316/1389\n' +
        'f 1242/1317/1390 384/417/1390 1237/1312/1390 1865/1964/1390\n' +
        'f 1865/1964/1391 1237/1312/1391 386/419/1391 1243/1318/1391\n' +
        'f 1241/1316/1392 1865/1964/1392 1243/1318/1392 320/346/1392\n' +
        'f 387/420/1393 1238/1313/1393 1866/1965/1393 1244/1319/1393\n' +
        'f 1238/1313/1394 385/418/1394 1245/1320/1394 1866/1965/1394\n' +
        'f 1866/1965/1395 1245/1320/1395 319/345/1395 1246/1321/1395\n' +
        'f 1244/1319/1396 1866/1965/1396 1246/1321/1396 321/348/1396\n' +
        'f 298/315/1397 1064/1125/1397 1867/1966/1397 1146/1214/1397\n' +
        'f 1064/1125/1398 300/317/1398 1247/1322/1398 1867/1966/1398\n' +
        'f 1867/1966/1399 1247/1322/1399 384/417/1399 1242/1317/1399\n' +
        'f 1146/1214/1400 1867/1966/1400 1242/1317/1400 318/344/1400\n' +
        'f 385/418/1401 1248/1323/1401 1868/1967/1401 1245/1320/1401\n' +
        'f 1248/1323/1402 301/318/1402 1065/1126/1402 1868/1967/1402\n' +
        'f 1868/1967/1403 1065/1126/1403 299/316/1403 1149/1217/1403\n' +
        'f 1245/1320/1404 1868/1967/1404 1149/1217/1404 319/345/1404\n' +
        'f 300/317/1405 1249/1324/1405 1869/1968/1405 1247/1322/1405\n' +
        'f 1249/1324/1406 344/374/1406 1110/1174/1406 1869/1968/1406\n' +
        'f 1869/1968/1407 1110/1174/1407 342/372/1407 1250/1325/1407\n' +
        'f 1247/1322/1408 1869/1968/1408 1250/1325/1408 384/417/1408\n' +
        'f 343/373/1409 1113/1177/1409 1870/1969/1409 1251/1326/1409\n' +
        'f 1113/1177/1410 345/375/1410 1252/1327/1410 1870/1969/1410\n' +
        'f 1870/1969/1411 1252/1327/1411 301/318/1411 1248/1323/1411\n' +
        'f 1251/1326/1412 1870/1969/1412 1248/1323/1412 385/418/1412\n' +
        'f 342/372/1413 1143/1211/1413 1871/1970/1413 1250/1325/1413\n' +
        'f 348/378/1414 1235/1310/1414 1871/1970/1414 1143/1211/1414\n' +
        'f 384/417/1415 1250/1325/1415 1871/1970/1415 1235/1310/1415\n' +
        'f 385/418/1416 1240/1315/1416 1872/1971/1416 1251/1326/1416\n' +
        'f 349/379/1417 1144/1212/1417 1872/1971/1417 1240/1315/1417\n' +
        'f 343/373/1418 1251/1326/1418 1872/1971/1418 1144/1212/1418\n' +
        'f 300/317/1419 1121/1185/1419 1873/1972/1419 1249/1324/1419\n' +
        'f 346/376/1420 1118/1182/1420 1873/1972/1420 1121/1185/1420\n' +
        'f 344/374/1421 1249/1324/1421 1873/1972/1421 1118/1182/1421\n' +
        'f 345/375/1422 1119/1183/1422 1874/1973/1422 1252/1327/1422\n' +
        'f 347/377/1423 1122/1186/1423 1874/1973/1423 1119/1183/1423\n' +
        'f 301/318/1424 1252/1327/1424 1874/1973/1424 1122/1186/1424\n' +
        'f 314/338/1425 1253/1328/1425 1875/1974/1425 1196/1268/1425\n' +
        'f 1253/1328/1426 322/350/1426 1254/1330/1426 1875/1974/1426\n' +
        'f 1875/1974/1427 1254/1330/1427 380/410/1427 1255/1331/1427\n' +
        'f 1196/1268/1428 1875/1974/1428 1255/1331/1428 378/408/1428\n' +
        'f 381/411/1429 1257/1333/1429 1876/1975/1429 1256/1332/1429\n' +
        'f 1257/1333/1430 323/352/1430 1258/1334/1430 1876/1975/1430\n' +
        'f 1876/1975/1431 1258/1334/1431 315/340/1431 1199/1271/1431\n' +
        'f 1256/1332/1432 1876/1975/1432 1199/1271/1432 379/409/1432\n' +
        'f 316/342/1433 1201/1273/1433 1877/1976/1433 1153/1222/1433\n' +
        'f 1201/1273/1434 378/408/1434 1255/1331/1434 1877/1976/1434\n' +
        'f 1877/1976/1435 1255/1331/1435 380/410/1435 1259/1336/1435\n' +
        'f 1153/1222/1436 1877/1976/1436 1259/1336/1436 324/354/1436\n' +
        'f 381/411/1437 1256/1332/1437 1878/1977/1437 1260/1337/1437\n' +
        'f 1256/1332/1438 379/409/1438 1204/1276/1438 1878/1977/1438\n' +
        'f 1878/1977/1439 1204/1276/1439 317/343/1439 1154/1223/1439\n' +
        'f 1260/1337/1440 1878/1977/1440 1154/1223/1440 325/355/1440\n' +
        'f 320/346/1441 1243/1318/1441 1879/1978/1441 1261/1338/1441\n' +
        'f 1243/1318/1442 386/419/1442 1262/1340/1442 1879/1978/1442\n' +
        'f 1879/1978/1443 1262/1340/1443 380/410/1443 1254/1330/1443\n' +
        'f 1261/1338/1444 1879/1978/1444 1254/1330/1444 322/350/1444\n' +
        'f 381/411/1445 1263/1341/1445 1880/1979/1445 1257/1333/1445\n' +
        'f 1263/1341/1446 387/420/1446 1244/1319/1446 1880/1979/1446\n' +
        'f 1880/1979/1447 1244/1319/1447 321/348/1447 1264/1342/1447\n' +
        'f 1257/1333/1448 1880/1979/1448 1264/1342/1448 323/352/1448\n' +
        'f 350/380/1449 1131/1197/1449 1881/1980/1449 1236/1311/1449\n' +
        'f 1131/1197/1450 352/382/1450 1265/1344/1450 1881/1980/1450\n' +
        'f 1881/1980/1451 1265/1344/1451 380/410/1451 1262/1340/1451\n' +
        'f 1236/1311/1452 1881/1980/1452 1262/1340/1452 386/419/1452\n' +
        'f 381/411/1453 1266/1345/1453 1882/1981/1453 1263/1341/1453\n' +
        'f 1266/1345/1454 353/383/1454 1134/1200/1454 1882/1981/1454\n' +
        'f 1882/1981/1455 1134/1200/1455 351/381/1455 1239/1314/1455\n' +
        'f 1263/1341/1456 1882/1981/1456 1239/1314/1456 387/420/1456\n' +
        'f 324/354/1457 1259/1336/1457 1883/1982/1457 1125/1190/1457\n' +
        'f 380/410/1458 1265/1344/1458 1883/1982/1458 1259/1336/1458\n' +
        'f 352/382/1459 1125/1190/1459 1883/1982/1459 1265/1344/1459\n' +
        'f 353/383/1460 1266/1345/1460 1884/1983/1460 1128/1193/1460\n' +
        'f 381/411/1461 1260/1337/1461 1884/1983/1461 1266/1345/1461\n' +
        'f 325/355/1462 1128/1193/1462 1884/1983/1462 1260/1337/1462\n' +
        'f 400/438/1463 1268/1347/1463 1885/1984/1463 1267/1346/1463\n' +
        'f 1268/1347/1464 388/421/1464 1269/1349/1464 1885/1984/1464\n' +
        'f 1885/1984/1465 1269/1349/1465 414/454/1465 1270/1350/1465\n' +
        'f 1267/1346/1466 1885/1984/1466 1270/1350/1466 402/442/1466\n' +
        'f 415/455/1467 1272/1352/1467 1886/1985/1467 1271/1351/1467\n' +
        'f 1272/1352/1468 389/424/1468 1273/1353/1468 1886/1985/1468\n' +
        'f 1886/1985/1469 1273/1353/1469 401/440/1469 1274/1355/1469\n' +
        'f 1271/1351/1470 1886/1985/1470 1274/1355/1470 403/443/1470\n' +
        'f 400/438/1471 1267/1346/1471 1887/1986/1471 1275/1356/1471\n' +
        'f 1267/1346/1472 402/442/1472 1276/1358/1472 1887/1986/1472\n' +
        'f 1887/1986/1473 1276/1358/1473 404/444/1473 1277/1359/1473\n' +
        'f 1275/1356/1474 1887/1986/1474 1277/1359/1474 398/434/1474\n' +
        'f 405/445/1475 1279/1361/1475 1888/1987/1475 1278/1360/1475\n' +
        'f 1279/1361/1476 403/443/1476 1274/1355/1476 1888/1987/1476\n' +
        'f 1888/1987/1477 1274/1355/1477 401/440/1477 1280/1362/1477\n' +
        'f 1278/1360/1478 1888/1987/1478 1280/1362/1478 399/436/1478\n' +
        'f 398/434/1479 1277/1359/1479 1889/1988/1479 1281/1364/1479\n' +
        'f 1277/1359/1480 404/444/1480 1282/1366/1480 1889/1988/1480\n' +
        'f 1889/1988/1481 1282/1366/1481 406/446/1481 1283/1367/1481\n' +
        'f 1281/1364/1482 1889/1988/1482 1283/1367/1482 396/432/1482\n' +
        'f 407/447/1483 1285/1369/1483 1890/1989/1483 1284/1368/1483\n' +
        'f 1285/1369/1484 405/445/1484 1278/1360/1484 1890/1989/1484\n' +
        'f 1890/1989/1485 1278/1360/1485 399/436/1485 1286/1370/1485\n' +
        'f 1284/1368/1486 1890/1989/1486 1286/1370/1486 397/433/1486\n' +
        'f 396/432/1487 1283/1367/1487 1891/1990/1487 1287/1372/1487\n' +
        'f 1283/1367/1488 406/446/1488 1288/1373/1488 1891/1990/1488\n' +
        'f 1891/1990/1489 1288/1373/1489 408/448/1489 1289/1374/1489\n' +
        'f 1287/1372/1490 1891/1990/1490 1289/1374/1490 394/430/1490\n' +
        'f 409/449/1491 1291/1376/1491 1892/1991/1491 1290/1375/1491\n' +
        'f 1291/1376/1492 407/447/1492 1284/1368/1492 1892/1991/1492\n' +
        'f 1892/1991/1493 1284/1368/1493 397/433/1493 1292/1377/1493\n' +
        'f 1290/1375/1494 1892/1991/1494 1292/1377/1494 395/431/1494\n' +
        'f 394/430/1495 1289/1374/1495 1893/1992/1495 1293/1378/1495\n' +
        'f 1289/1374/1496 408/448/1496 1294/1379/1496 1893/1992/1496\n' +
        'f 1893/1992/1497 1294/1379/1497 410/450/1497 1295/1380/1497\n' +
        'f 1293/1378/1498 1893/1992/1498 1295/1380/1498 392/428/1498\n' +
        'f 411/451/1499 1297/1382/1499 1894/1993/1499 1296/1381/1499\n' +
        'f 1297/1382/1500 409/449/1500 1290/1375/1500 1894/1993/1500\n' +
        'f 1894/1993/1501 1290/1375/1501 395/431/1501 1298/1383/1501\n' +
        'f 1296/1381/1502 1894/1993/1502 1298/1383/1502 393/429/1502\n' +
        'f 392/428/1503 1295/1380/1503 1895/1994/1503 1299/1384/1503\n' +
        'f 1295/1380/1504 410/450/1504 1300/1385/1504 1895/1994/1504\n' +
        'f 1895/1994/1505 1300/1385/1505 412/452/1505 1301/1386/1505\n' +
        'f 1299/1384/1506 1895/1994/1506 1301/1386/1506 390/426/1506\n' +
        'f 413/453/1507 1303/1388/1507 1896/1995/1507 1302/1387/1507\n' +
        'f 1303/1388/1508 411/451/1508 1296/1381/1508 1896/1995/1508\n' +
        'f 1896/1995/1509 1296/1381/1509 393/429/1509 1304/1389/1509\n' +
        'f 1302/1387/1510 1896/1995/1510 1304/1389/1510 391/427/1510\n' +
        'f 410/450/1511 1305/1390/1511 1897/1996/1511 1300/1385/1511\n' +
        'f 1305/1390/1512 420/460/1512 1306/1391/1512 1897/1996/1512\n' +
        'f 1897/1996/1513 1306/1391/1513 418/458/1513 1307/1392/1513\n' +
        'f 1300/1385/1514 1897/1996/1514 1307/1392/1514 412/452/1514\n' +
        'f 419/459/1515 1309/1394/1515 1898/1997/1515 1308/1393/1515\n' +
        'f 1309/1394/1516 421/461/1516 1310/1395/1516 1898/1997/1516\n' +
        'f 1898/1997/1517 1310/1395/1517 411/451/1517 1303/1388/1517\n' +
        'f 1308/1393/1518 1898/1997/1518 1303/1388/1518 413/453/1518\n' +
        'f 408/448/1519 1311/1396/1519 1899/1998/1519 1294/1379/1519\n' +
        'f 1311/1396/1520 422/462/1520 1312/1397/1520 1899/1998/1520\n' +
        'f 1899/1998/1521 1312/1397/1521 420/460/1521 1305/1390/1521\n' +
        'f 1294/1379/1522 1899/1998/1522 1305/1390/1522 410/450/1522\n' +
        'f 421/461/1523 1313/1398/1523 1900/1999/1523 1310/1395/1523\n' +
        'f 1313/1398/1524 423/463/1524 1314/1399/1524 1900/1999/1524\n' +
        'f 1900/1999/1525 1314/1399/1525 409/449/1525 1297/1382/1525\n' +
        'f 1310/1395/1526 1900/1999/1526 1297/1382/1526 411/451/1526\n' +
        'f 406/446/1527 1315/1400/1527 1901/2000/1527 1288/1373/1527\n' +
        'f 1315/1400/1528 424/464/1528 1316/1401/1528 1901/2000/1528\n' +
        'f 1901/2000/1529 1316/1401/1529 422/462/1529 1311/1396/1529\n' +
        'f 1288/1373/1530 1901/2000/1530 1311/1396/1530 408/448/1530\n' +
        'f 423/463/1531 1317/1402/1531 1902/2001/1531 1314/1399/1531\n' +
        'f 1317/1402/1532 425/465/1532 1318/1403/1532 1902/2001/1532\n' +
        'f 1902/2001/1533 1318/1403/1533 407/447/1533 1291/1376/1533\n' +
        'f 1314/1399/1534 1902/2001/1534 1291/1376/1534 409/449/1534\n' +
        'f 404/444/1535 1319/1404/1535 1903/2002/1535 1282/1366/1535\n' +
        'f 1319/1404/1536 426/466/1536 1320/1405/1536 1903/2002/1536\n' +
        'f 1903/2002/1537 1320/1405/1537 424/464/1537 1315/1400/1537\n' +
        'f 1282/1366/1538 1903/2002/1538 1315/1400/1538 406/446/1538\n' +
        'f 425/465/1539 1321/1406/1539 1904/2003/1539 1318/1403/1539\n' +
        'f 1321/1406/1540 427/467/1540 1322/1407/1540 1904/2003/1540\n' +
        'f 1904/2003/1541 1322/1407/1541 405/445/1541 1285/1369/1541\n' +
        'f 1318/1403/1542 1904/2003/1542 1285/1369/1542 407/447/1542\n' +
        'f 402/442/1543 1323/1408/1543 1905/2004/1543 1276/1358/1543\n' +
        'f 1323/1408/1544 428/468/1544 1324/1409/1544 1905/2004/1544\n' +
        'f 1905/2004/1545 1324/1409/1545 426/466/1545 1319/1404/1545\n' +
        'f 1276/1358/1546 1905/2004/1546 1319/1404/1546 404/444/1546\n' +
        'f 427/467/1547 1325/1410/1547 1906/2005/1547 1322/1407/1547\n' +
        'f 1325/1410/1548 429/469/1548 1326/1411/1548 1906/2005/1548\n' +
        'f 1906/2005/1549 1326/1411/1549 403/443/1549 1279/1361/1549\n' +
        'f 1322/1407/1550 1906/2005/1550 1279/1361/1550 405/445/1550\n' +
        'f 402/442/1551 1270/1350/1551 1907/2006/1551 1323/1408/1551\n' +
        'f 1270/1350/1552 414/454/1552 1327/1412/1552 1907/2006/1552\n' +
        'f 1907/2006/1553 1327/1412/1553 416/456/1553 1328/1413/1553\n' +
        'f 1323/1408/1554 1907/2006/1554 1328/1413/1554 428/468/1554\n' +
        'f 417/457/1555 1330/1415/1555 1908/2007/1555 1329/1414/1555\n' +
        'f 1330/1415/1556 415/455/1556 1271/1351/1556 1908/2007/1556\n' +
        'f 1908/2007/1557 1271/1351/1557 403/443/1557 1326/1411/1557\n' +
        'f 1329/1414/1558 1908/2007/1558 1326/1411/1558 429/469/1558\n' +
        'f 318/344/1559 1241/1316/1559 1909/2008/1559 1331/1416/1559\n' +
        'f 1241/1316/1560 320/346/1560 1332/1417/1560 1909/2008/1560\n' +
        'f 1909/2008/1561 1332/1417/1561 444/487/1561 1333/1419/1561\n' +
        'f 1331/1416/1562 1909/2008/1562 1333/1419/1562 442/484/1562\n' +
        'f 445/489/1563 1335/1421/1563 1910/2009/1563 1334/1420/1563\n' +
        'f 1335/1421/1564 321/348/1564 1246/1321/1564 1910/2009/1564\n' +
        'f 1910/2009/1565 1246/1321/1565 319/345/1565 1336/1423/1565\n' +
        'f 1334/1420/1566 1910/2009/1566 1336/1423/1566 443/485/1566\n' +
        'f 320/347/1567 1337/1424/1567 1911/2010/1567 1332/1418/1567\n' +
        'f 1337/1424/1568 390/426/1568 1301/1386/1568 1911/2010/1568\n' +
        'f 1911/2010/1569 1301/1386/1569 412/452/1569 1338/1425/1569\n' +
        'f 1332/1418/1570 1911/2010/1570 1338/1425/1570 444/486/1570\n' +
        'f 413/453/1571 1302/1387/1571 1912/2011/1571 1339/1426/1571\n' +
        'f 1302/1387/1572 391/427/1572 1340/1427/1572 1912/2011/1572\n' +
        'f 1912/2011/1573 1340/1427/1573 321/349/1573 1335/1422/1573\n' +
        'f 1339/1426/1574 1912/2011/1574 1335/1422/1574 445/488/1574\n' +
        'f 310/334/1575 1147/1215/1575 1913/2012/1575 1225/1299/1575\n' +
        'f 1147/1215/1576 318/344/1576 1331/1416/1576 1913/2012/1576\n' +
        'f 1913/2012/1577 1331/1416/1577 442/484/1577 1341/1428/1577\n' +
        'f 1225/1299/1578 1913/2012/1578 1341/1428/1578 312/336/1578\n' +
        'f 443/485/1579 1336/1423/1579 1914/2013/1579 1342/1429/1579\n' +
        'f 1336/1423/1580 319/345/1580 1148/1216/1580 1914/2013/1580\n' +
        'f 1914/2013/1581 1148/1216/1581 311/335/1581 1228/1302/1581\n' +
        'f 1342/1429/1582 1914/2013/1582 1228/1302/1582 313/337/1582\n' +
        'f 382/412/1583 1344/1432/1583 1915/2014/1583 1343/1430/1583\n' +
        'f 1344/1432/1584 430/470/1584 1345/1434/1584 1915/2014/1584\n' +
        'f 1915/2014/1585 1345/1434/1585 414/454/1585 1269/1349/1585\n' +
        'f 1343/1430/1586 1915/2014/1586 1269/1349/1586 388/421/1586\n' +
        'f 415/455/1587 1346/1435/1587 1916/2015/1587 1272/1352/1587\n' +
        'f 1346/1435/1588 431/472/1588 1347/1436/1588 1916/2015/1588\n' +
        'f 1916/2015/1589 1347/1436/1589 383/414/1589 1348/1438/1589\n' +
        'f 1272/1352/1590 1916/2015/1590 1348/1438/1590 389/424/1590\n' +
        'f 412/452/1591 1307/1392/1591 1917/2016/1591 1338/1425/1591\n' +
        'f 1307/1392/1592 418/458/1592 1349/1440/1592 1917/2016/1592\n' +
        'f 1917/2016/1593 1349/1440/1593 440/482/1593 1350/1441/1593\n' +
        'f 1338/1425/1594 1917/2016/1594 1350/1441/1594 444/486/1594\n' +
        'f 441/483/1595 1352/1443/1595 1918/2017/1595 1351/1442/1595\n' +
        'f 1352/1443/1596 419/459/1596 1308/1393/1596 1918/2017/1596\n' +
        'f 1918/2017/1597 1308/1393/1597 413/453/1597 1339/1426/1597\n' +
        'f 1351/1442/1598 1918/2017/1598 1339/1426/1598 445/488/1598\n' +
        'f 438/480/1599 1354/1445/1599 1919/2018/1599 1353/1444/1599\n' +
        'f 1354/1445/1600 446/490/1600 1355/1446/1600 1919/2018/1600\n' +
        'f 1919/2018/1601 1355/1446/1601 444/486/1601 1350/1441/1601\n' +
        'f 1353/1444/1602 1919/2018/1602 1350/1441/1602 440/482/1602\n' +
        'f 445/488/1603 1356/1448/1603 1920/2019/1603 1351/1442/1603\n' +
        'f 1356/1448/1604 447/492/1604 1357/1450/1604 1920/2019/1604\n' +
        'f 1920/2019/1605 1357/1450/1605 439/481/1605 1358/1451/1605\n' +
        'f 1351/1442/1606 1920/2019/1606 1358/1451/1606 441/483/1606\n' +
        'f 434/476/1607 1360/1453/1607 1921/2020/1607 1359/1452/1607\n' +
        'f 1360/1453/1608 446/490/1608 1354/1445/1608 1921/2020/1608\n' +
        'f 1921/2020/1609 1354/1445/1609 438/480/1609 1361/1454/1609\n' +
        'f 1359/1452/1610 1921/2020/1610 1361/1454/1610 436/478/1610\n' +
        'f 439/481/1611 1357/1450/1611 1922/2021/1611 1362/1455/1611\n' +
        'f 1357/1450/1612 447/492/1612 1363/1456/1612 1922/2021/1612\n' +
        'f 1922/2021/1613 1363/1456/1613 435/477/1613 1364/1457/1613\n' +
        'f 1362/1455/1614 1922/2021/1614 1364/1457/1614 437/479/1614\n' +
        'f 432/474/1615 1366/1459/1615 1923/2022/1615 1365/1458/1615\n' +
        'f 1366/1459/1616 448/494/1616 1367/1460/1616 1923/2022/1616\n' +
        'f 1923/2022/1617 1367/1460/1617 446/490/1617 1360/1453/1617\n' +
        'f 1365/1458/1618 1923/2022/1618 1360/1453/1618 434/476/1618\n' +
        'f 447/492/1619 1368/1462/1619 1924/2023/1619 1363/1456/1619\n' +
        'f 1368/1462/1620 449/496/1620 1369/1464/1620 1924/2023/1620\n' +
        'f 1924/2023/1621 1369/1464/1621 433/475/1621 1370/1465/1621\n' +
        'f 1363/1456/1622 1924/2023/1622 1370/1465/1622 435/477/1622\n' +
        'f 430/470/1623 1372/1467/1623 1925/2024/1623 1371/1466/1623\n' +
        'f 1372/1467/1624 448/494/1624 1366/1459/1624 1925/2024/1624\n' +
        'f 1925/2024/1625 1366/1459/1625 432/474/1625 1373/1469/1625\n' +
        'f 1371/1466/1626 1925/2024/1626 1373/1469/1626 450/498/1626\n' +
        'f 433/475/1627 1369/1464/1627 1926/2025/1627 1374/1470/1627\n' +
        'f 1369/1464/1628 449/496/1628 1375/1471/1628 1926/2025/1628\n' +
        'f 1926/2025/1629 1375/1471/1629 431/472/1629 1376/1473/1629\n' +
        'f 1374/1470/1630 1926/2025/1630 1376/1473/1630 451/499/1630\n' +
        'f 414/454/1631 1345/1434/1631 1927/2026/1631 1327/1412/1631\n' +
        'f 1345/1434/1632 430/470/1632 1371/1466/1632 1927/2026/1632\n' +
        'f 1927/2026/1633 1371/1466/1633 450/498/1633 1377/1474/1633\n' +
        'f 1327/1412/1634 1927/2026/1634 1377/1474/1634 416/456/1634\n' +
        'f 451/499/1635 1376/1473/1635 1928/2027/1635 1378/1475/1635\n' +
        'f 1376/1473/1636 431/472/1636 1346/1435/1636 1928/2027/1636\n' +
        'f 1928/2027/1637 1346/1435/1637 415/455/1637 1330/1415/1637\n' +
        'f 1378/1475/1638 1928/2027/1638 1330/1415/1638 417/457/1638\n' +
        'f 312/336/1639 1379/1476/1639 1929/2028/1639 1229/1303/1639\n' +
        'f 1379/1476/1640 448/495/1640 1372/1468/1640 1929/2028/1640\n' +
        'f 1929/2028/1641 1372/1468/1641 430/471/1641 1344/1433/1641\n' +
        'f 1229/1303/1642 1929/2028/1642 1344/1433/1642 382/413/1642\n' +
        'f 431/473/1643 1375/1472/1643 1930/2029/1643 1347/1437/1643\n' +
        'f 1375/1472/1644 449/497/1644 1380/1477/1644 1930/2029/1644\n' +
        'f 1930/2029/1645 1380/1477/1645 313/337/1645 1232/1306/1645\n' +
        'f 1347/1437/1646 1930/2029/1646 1232/1306/1646 383/415/1646\n' +
        'f 312/336/1647 1341/1428/1647 1931/2030/1647 1379/1476/1647\n' +
        'f 1341/1428/1648 442/484/1648 1381/1478/1648 1931/2030/1648\n' +
        'f 1931/2030/1649 1381/1478/1649 446/491/1649 1367/1461/1649\n' +
        'f 1379/1476/1650 1931/2030/1650 1367/1461/1650 448/495/1650\n' +
        'f 447/493/1651 1382/1479/1651 1932/2031/1651 1368/1463/1651\n' +
        'f 1382/1479/1652 443/485/1652 1342/1429/1652 1932/2031/1652\n' +
        'f 1932/2031/1653 1342/1429/1653 313/337/1653 1380/1477/1653\n' +
        'f 1368/1463/1654 1932/2031/1654 1380/1477/1654 449/497/1654\n' +
        'f 442/484/1655 1333/1419/1655 1933/2032/1655 1381/1478/1655\n' +
        'f 444/487/1656 1355/1447/1656 1933/2032/1656 1333/1419/1656\n' +
        'f 446/491/1657 1381/1478/1657 1933/2032/1657 1355/1447/1657\n' +
        'f 447/493/1658 1356/1449/1658 1934/2033/1658 1382/1479/1658\n' +
        'f 445/489/1659 1334/1420/1659 1934/2033/1659 1356/1449/1659\n' +
        'f 443/485/1660 1382/1479/1660 1934/2033/1660 1334/1420/1660\n' +
        'f 416/456/1661 1377/1474/1661 1935/2034/1661 1383/1480/1661\n' +
        'f 1377/1474/1662 450/498/1662 1384/1481/1662 1935/2034/1662\n' +
        'f 1935/2034/1663 1384/1481/1663 452/500/1663 1385/1482/1663\n' +
        'f 1383/1480/1664 1935/2034/1664 1385/1482/1664 476/524/1664\n' +
        'f 453/501/1665 1387/1484/1665 1936/2035/1665 1386/1483/1665\n' +
        'f 1387/1484/1666 451/499/1666 1378/1475/1666 1936/2035/1666\n' +
        'f 1936/2035/1667 1378/1475/1667 417/457/1667 1388/1485/1667\n' +
        'f 1386/1483/1668 1936/2035/1668 1388/1485/1668 477/525/1668\n' +
        'f 450/498/1669 1373/1469/1669 1937/2036/1669 1384/1481/1669\n' +
        'f 1373/1469/1670 432/474/1670 1389/1486/1670 1937/2036/1670\n' +
        'f 1937/2036/1671 1389/1486/1671 462/510/1671 1390/1487/1671\n' +
        'f 1384/1481/1672 1937/2036/1672 1390/1487/1672 452/500/1672\n' +
        'f 463/511/1673 1392/1489/1673 1938/2037/1673 1391/1488/1673\n' +
        'f 1392/1489/1674 433/475/1674 1374/1470/1674 1938/2037/1674\n' +
        'f 1938/2037/1675 1374/1470/1675 451/499/1675 1387/1484/1675\n' +
        'f 1391/1488/1676 1938/2037/1676 1387/1484/1676 453/501/1676\n' +
        'f 432/474/1677 1365/1458/1677 1939/2038/1677 1389/1486/1677\n' +
        'f 1365/1458/1678 434/476/1678 1393/1490/1678 1939/2038/1678\n' +
        'f 1939/2038/1679 1393/1490/1679 460/508/1679 1394/1491/1679\n' +
        'f 1389/1486/1680 1939/2038/1680 1394/1491/1680 462/510/1680\n' +
        'f 461/509/1681 1396/1493/1681 1940/2039/1681 1395/1492/1681\n' +
        'f 1396/1493/1682 435/477/1682 1370/1465/1682 1940/2039/1682\n' +
        'f 1940/2039/1683 1370/1465/1683 433/475/1683 1392/1489/1683\n' +
        'f 1395/1492/1684 1940/2039/1684 1392/1489/1684 463/511/1684\n' +
        'f 434/476/1685 1359/1452/1685 1941/2040/1685 1393/1490/1685\n' +
        'f 1359/1452/1686 436/478/1686 1397/1494/1686 1941/2040/1686\n' +
        'f 1941/2040/1687 1397/1494/1687 458/506/1687 1398/1495/1687\n' +
        'f 1393/1490/1688 1941/2040/1688 1398/1495/1688 460/508/1688\n' +
        'f 459/507/1689 1400/1497/1689 1942/2041/1689 1399/1496/1689\n' +
        'f 1400/1497/1690 437/479/1690 1364/1457/1690 1942/2041/1690\n' +
        'f 1942/2041/1691 1364/1457/1691 435/477/1691 1396/1493/1691\n' +
        'f 1399/1496/1692 1942/2041/1692 1396/1493/1692 461/509/1692\n' +
        'f 436/478/1693 1361/1454/1693 1943/2042/1693 1397/1494/1693\n' +
        'f 1361/1454/1694 438/480/1694 1401/1498/1694 1943/2042/1694\n' +
        'f 1943/2042/1695 1401/1498/1695 456/504/1695 1402/1499/1695\n' +
        'f 1397/1494/1696 1943/2042/1696 1402/1499/1696 458/506/1696\n' +
        'f 457/505/1697 1404/1501/1697 1944/2043/1697 1403/1500/1697\n' +
        'f 1404/1501/1698 439/481/1698 1362/1455/1698 1944/2043/1698\n' +
        'f 1944/2043/1699 1362/1455/1699 437/479/1699 1400/1497/1699\n' +
        'f 1403/1500/1700 1944/2043/1700 1400/1497/1700 459/507/1700\n' +
        'f 438/480/1701 1353/1444/1701 1945/2044/1701 1401/1498/1701\n' +
        'f 1353/1444/1702 440/482/1702 1405/1502/1702 1945/2044/1702\n' +
        'f 1945/2044/1703 1405/1502/1703 454/502/1703 1406/1503/1703\n' +
        'f 1401/1498/1704 1945/2044/1704 1406/1503/1704 456/504/1704\n' +
        'f 455/503/1705 1408/1505/1705 1946/2045/1705 1407/1504/1705\n' +
        'f 1408/1505/1706 441/483/1706 1358/1451/1706 1946/2045/1706\n' +
        'f 1946/2045/1707 1358/1451/1707 439/481/1707 1404/1501/1707\n' +
        'f 1407/1504/1708 1946/2045/1708 1404/1501/1708 457/505/1708\n' +
        'f 440/482/1709 1349/1440/1709 1947/2046/1709 1405/1502/1709\n' +
        'f 1349/1440/1710 418/458/1710 1409/1506/1710 1947/2046/1710\n' +
        'f 1947/2046/1711 1409/1506/1711 474/522/1711 1410/1507/1711\n' +
        'f 1405/1502/1712 1947/2046/1712 1410/1507/1712 454/502/1712\n' +
        'f 475/523/1713 1412/1509/1713 1948/2047/1713 1411/1508/1713\n' +
        'f 1412/1509/1714 419/459/1714 1352/1443/1714 1948/2047/1714\n' +
        'f 1948/2047/1715 1352/1443/1715 441/483/1715 1408/1505/1715\n' +
        'f 1411/1508/1716 1948/2047/1716 1408/1505/1716 455/503/1716\n' +
        'f 428/468/1717 1328/1413/1717 1949/2048/1717 1413/1510/1717\n' +
        'f 1328/1413/1718 416/456/1718 1383/1480/1718 1949/2048/1718\n' +
        'f 1949/2048/1719 1383/1480/1719 476/524/1719 1414/1511/1719\n' +
        'f 1413/1510/1720 1949/2048/1720 1414/1511/1720 464/512/1720\n' +
        'f 477/525/1721 1388/1485/1721 1950/2049/1721 1415/1512/1721\n' +
        'f 1388/1485/1722 417/457/1722 1329/1414/1722 1950/2049/1722\n' +
        'f 1950/2049/1723 1329/1414/1723 429/469/1723 1416/1513/1723\n' +
        'f 1415/1512/1724 1950/2049/1724 1416/1513/1724 465/513/1724\n' +
        'f 426/466/1725 1324/1409/1725 1951/2050/1725 1417/1514/1725\n' +
        'f 1324/1409/1726 428/468/1726 1413/1510/1726 1951/2050/1726\n' +
        'f 1951/2050/1727 1413/1510/1727 464/512/1727 1418/1515/1727\n' +
        'f 1417/1514/1728 1951/2050/1728 1418/1515/1728 466/514/1728\n' +
        'f 465/513/1729 1416/1513/1729 1952/2051/1729 1419/1516/1729\n' +
        'f 1416/1513/1730 429/469/1730 1325/1410/1730 1952/2051/1730\n' +
        'f 1952/2051/1731 1325/1410/1731 427/467/1731 1420/1517/1731\n' +
        'f 1419/1516/1732 1952/2051/1732 1420/1517/1732 467/515/1732\n' +
        'f 424/464/1733 1320/1405/1733 1953/2052/1733 1421/1518/1733\n' +
        'f 1320/1405/1734 426/466/1734 1417/1514/1734 1953/2052/1734\n' +
        'f 1953/2052/1735 1417/1514/1735 466/514/1735 1422/1519/1735\n' +
        'f 1421/1518/1736 1953/2052/1736 1422/1519/1736 468/516/1736\n' +
        'f 467/515/1737 1420/1517/1737 1954/2053/1737 1423/1520/1737\n' +
        'f 1420/1517/1738 427/467/1738 1321/1406/1738 1954/2053/1738\n' +
        'f 1954/2053/1739 1321/1406/1739 425/465/1739 1424/1521/1739\n' +
        'f 1423/1520/1740 1954/2053/1740 1424/1521/1740 469/517/1740\n' +
        'f 422/462/1741 1316/1401/1741 1955/2054/1741 1425/1522/1741\n' +
        'f 1316/1401/1742 424/464/1742 1421/1518/1742 1955/2054/1742\n' +
        'f 1955/2054/1743 1421/1518/1743 468/516/1743 1426/1523/1743\n' +
        'f 1425/1522/1744 1955/2054/1744 1426/1523/1744 470/518/1744\n' +
        'f 469/517/1745 1424/1521/1745 1956/2055/1745 1427/1524/1745\n' +
        'f 1424/1521/1746 425/465/1746 1317/1402/1746 1956/2055/1746\n' +
        'f 1956/2055/1747 1317/1402/1747 423/463/1747 1428/1525/1747\n' +
        'f 1427/1524/1748 1956/2055/1748 1428/1525/1748 471/519/1748\n' +
        'f 420/460/1749 1312/1397/1749 1957/2056/1749 1429/1526/1749\n' +
        'f 1312/1397/1750 422/462/1750 1425/1522/1750 1957/2056/1750\n' +
        'f 1957/2056/1751 1425/1522/1751 470/518/1751 1430/1527/1751\n' +
        'f 1429/1526/1752 1957/2056/1752 1430/1527/1752 472/520/1752\n' +
        'f 471/519/1753 1428/1525/1753 1958/2057/1753 1431/1528/1753\n' +
        'f 1428/1525/1754 423/463/1754 1313/1398/1754 1958/2057/1754\n' +
        'f 1958/2057/1755 1313/1398/1755 421/461/1755 1432/1529/1755\n' +
        'f 1431/1528/1756 1958/2057/1756 1432/1529/1756 473/521/1756\n' +
        'f 418/458/1757 1306/1391/1757 1959/2058/1757 1409/1506/1757\n' +
        'f 1306/1391/1758 420/460/1758 1429/1526/1758 1959/2058/1758\n' +
        'f 1959/2058/1759 1429/1526/1759 472/520/1759 1433/1530/1759\n' +
        'f 1409/1506/1760 1959/2058/1760 1433/1530/1760 474/522/1760\n' +
        'f 473/521/1761 1432/1529/1761 1960/2059/1761 1434/1531/1761\n' +
        'f 1432/1529/1762 421/461/1762 1309/1394/1762 1960/2059/1762\n' +
        'f 1960/2059/1763 1309/1394/1763 419/459/1763 1412/1509/1763\n' +
        'f 1434/1531/1764 1960/2059/1764 1412/1509/1764 475/523/1764\n' +
        'f 458/506/1765 1402/1499/1765 1961/2060/1765 1435/1532/1765\n' +
        'f 1402/1499/1766 456/504/1766 1436/1533/1766 1961/2060/1766\n' +
        'f 1961/2060/1767 1436/1533/1767 480/528/1767 1437/1534/1767\n' +
        'f 1435/1532/1768 1961/2060/1768 1437/1534/1768 478/526/1768\n' +
        'f 481/529/1769 1439/1536/1769 1962/2061/1769 1438/1535/1769\n' +
        'f 1439/1536/1770 457/505/1770 1403/1500/1770 1962/2061/1770\n' +
        'f 1962/2061/1771 1403/1500/1771 459/507/1771 1440/1537/1771\n' +
        'f 1438/1535/1772 1962/2061/1772 1440/1537/1772 479/527/1772\n' +
        'f 478/526/1773 1437/1534/1773 1963/2062/1773 1441/1538/1773\n' +
        'f 1437/1534/1774 480/528/1774 1442/1539/1774 1963/2062/1774\n' +
        'f 1963/2062/1775 1442/1539/1775 482/530/1775 1443/1540/1775\n' +
        'f 1441/1538/1776 1963/2062/1776 1443/1540/1776 484/532/1776\n' +
        'f 483/531/1777 1445/1542/1777 1964/2063/1777 1444/1541/1777\n' +
        'f 1445/1542/1778 481/529/1778 1438/1535/1778 1964/2063/1778\n' +
        'f 1964/2063/1779 1438/1535/1779 479/527/1779 1446/1543/1779\n' +
        'f 1444/1541/1780 1964/2063/1780 1446/1543/1780 485/533/1780\n' +
        'f 484/532/1781 1443/1540/1781 1965/2064/1781 1447/1544/1781\n' +
        'f 1443/1540/1782 482/530/1782 1448/1545/1782 1965/2064/1782\n' +
        'f 1965/2064/1783 1448/1545/1783 488/536/1783 1449/1546/1783\n' +
        'f 1447/1544/1784 1965/2064/1784 1449/1546/1784 486/534/1784\n' +
        'f 489/537/1785 1451/1548/1785 1966/2065/1785 1450/1547/1785\n' +
        'f 1451/1548/1786 483/531/1786 1444/1541/1786 1966/2065/1786\n' +
        'f 1966/2065/1787 1444/1541/1787 485/533/1787 1452/1549/1787\n' +
        'f 1450/1547/1788 1966/2065/1788 1452/1549/1788 487/535/1788\n' +
        'f 486/534/1789 1449/1546/1789 1967/2066/1789 1453/1550/1789\n' +
        'f 1449/1546/1790 488/536/1790 1454/1551/1790 1967/2066/1790\n' +
        'f 1967/2066/1791 1454/1551/1791 490/538/1791 1455/1552/1791\n' +
        'f 1453/1550/1792 1967/2066/1792 1455/1552/1792 492/540/1792\n' +
        'f 491/539/1793 1457/1554/1793 1968/2067/1793 1456/1553/1793\n' +
        'f 1457/1554/1794 489/537/1794 1450/1547/1794 1968/2067/1794\n' +
        'f 1968/2067/1795 1450/1547/1795 487/535/1795 1458/1555/1795\n' +
        'f 1456/1553/1796 1968/2067/1796 1458/1555/1796 493/541/1796\n' +
        'f 464/512/1797 1414/1511/1797 1969/2068/1797 1459/1556/1797\n' +
        'f 1414/1511/1798 476/524/1798 1460/1557/1798 1969/2068/1798\n' +
        'f 1969/2068/1799 1460/1557/1799 486/534/1799 1453/1550/1799\n' +
        'f 1459/1556/1800 1969/2068/1800 1453/1550/1800 492/540/1800\n' +
        'f 487/535/1801 1461/1558/1801 1970/2069/1801 1458/1555/1801\n' +
        'f 1461/1558/1802 477/525/1802 1415/1512/1802 1970/2069/1802\n' +
        'f 1970/2069/1803 1415/1512/1803 465/513/1803 1462/1559/1803\n' +
        'f 1458/1555/1804 1970/2069/1804 1462/1559/1804 493/541/1804\n' +
        'f 452/500/1805 1463/1560/1805 1971/2070/1805 1385/1482/1805\n' +
        'f 1463/1560/1806 484/532/1806 1447/1544/1806 1971/2070/1806\n' +
        'f 1971/2070/1807 1447/1544/1807 486/534/1807 1460/1557/1807\n' +
        'f 1385/1482/1808 1971/2070/1808 1460/1557/1808 476/524/1808\n' +
        'f 487/535/1809 1452/1549/1809 1972/2071/1809 1461/1558/1809\n' +
        'f 1452/1549/1810 485/533/1810 1464/1561/1810 1972/2071/1810\n' +
        'f 1972/2071/1811 1464/1561/1811 453/501/1811 1386/1483/1811\n' +
        'f 1461/1558/1812 1972/2071/1812 1386/1483/1812 477/525/1812\n' +
        'f 452/500/1813 1390/1487/1813 1973/2072/1813 1463/1560/1813\n' +
        'f 1390/1487/1814 462/510/1814 1465/1562/1814 1973/2072/1814\n' +
        'f 1973/2072/1815 1465/1562/1815 478/526/1815 1441/1538/1815\n' +
        'f 1463/1560/1816 1973/2072/1816 1441/1538/1816 484/532/1816\n' +
        'f 479/527/1817 1466/1563/1817 1974/2073/1817 1446/1543/1817\n' +
        'f 1466/1563/1818 463/511/1818 1391/1488/1818 1974/2073/1818\n' +
        'f 1974/2073/1819 1391/1488/1819 453/501/1819 1464/1561/1819\n' +
        'f 1446/1543/1820 1974/2073/1820 1464/1561/1820 485/533/1820\n' +
        'f 458/506/1821 1435/1532/1821 1975/2074/1821 1398/1495/1821\n' +
        'f 1435/1532/1822 478/526/1822 1465/1562/1822 1975/2074/1822\n' +
        'f 1975/2074/1823 1465/1562/1823 462/510/1823 1394/1491/1823\n' +
        'f 1398/1495/1824 1975/2074/1824 1394/1491/1824 460/508/1824\n' +
        'f 463/511/1825 1466/1563/1825 1976/2075/1825 1395/1492/1825\n' +
        'f 1466/1563/1826 479/527/1826 1440/1537/1826 1976/2075/1826\n' +
        'f 1976/2075/1827 1440/1537/1827 459/507/1827 1399/1496/1827\n' +
        'f 1395/1492/1828 1976/2075/1828 1399/1496/1828 461/509/1828\n' +
        'f 454/502/1829 1410/1507/1829 1977/2076/1829 1406/1503/1829\n' +
        'f 1410/1507/1830 474/522/1830 1467/1564/1830 1977/2076/1830\n' +
        'f 1977/2076/1831 1467/1564/1831 480/528/1831 1436/1533/1831\n' +
        'f 1406/1503/1832 1977/2076/1832 1436/1533/1832 456/504/1832\n' +
        'f 481/529/1833 1468/1565/1833 1978/2077/1833 1439/1536/1833\n' +
        'f 1468/1565/1834 475/523/1834 1411/1508/1834 1978/2077/1834\n' +
        'f 1978/2077/1835 1411/1508/1835 455/503/1835 1407/1504/1835\n' +
        'f 1439/1536/1836 1978/2077/1836 1407/1504/1836 457/505/1836\n' +
        'f 472/520/1837 1469/1566/1837 1979/2078/1837 1433/1530/1837\n' +
        'f 1469/1566/1838 482/530/1838 1442/1539/1838 1979/2078/1838\n' +
        'f 1979/2078/1839 1442/1539/1839 480/528/1839 1467/1564/1839\n' +
        'f 1433/1530/1840 1979/2078/1840 1467/1564/1840 474/522/1840\n' +
        'f 481/529/1841 1445/1542/1841 1980/2079/1841 1468/1565/1841\n' +
        'f 1445/1542/1842 483/531/1842 1470/1567/1842 1980/2079/1842\n' +
        'f 1980/2079/1843 1470/1567/1843 473/521/1843 1434/1531/1843\n' +
        'f 1468/1565/1844 1980/2079/1844 1434/1531/1844 475/523/1844\n' +
        'f 470/518/1845 1471/1568/1845 1981/2080/1845 1430/1527/1845\n' +
        'f 1471/1568/1846 488/536/1846 1448/1545/1846 1981/2080/1846\n' +
        'f 1981/2080/1847 1448/1545/1847 482/530/1847 1469/1566/1847\n' +
        'f 1430/1527/1848 1981/2080/1848 1469/1566/1848 472/520/1848\n' +
        'f 483/531/1849 1451/1548/1849 1982/2081/1849 1470/1567/1849\n' +
        'f 1451/1548/1850 489/537/1850 1472/1569/1850 1982/2081/1850\n' +
        'f 1982/2081/1851 1472/1569/1851 471/519/1851 1431/1528/1851\n' +
        'f 1470/1567/1852 1982/2081/1852 1431/1528/1852 473/521/1852\n' +
        'f 468/516/1853 1473/1570/1853 1983/2082/1853 1426/1523/1853\n' +
        'f 1473/1570/1854 490/538/1854 1454/1551/1854 1983/2082/1854\n' +
        'f 1983/2082/1855 1454/1551/1855 488/536/1855 1471/1568/1855\n' +
        'f 1426/1523/1856 1983/2082/1856 1471/1568/1856 470/518/1856\n' +
        'f 489/537/1857 1457/1554/1857 1984/2083/1857 1472/1569/1857\n' +
        'f 1457/1554/1858 491/539/1858 1474/1571/1858 1984/2083/1858\n' +
        'f 1984/2083/1859 1474/1571/1859 469/517/1859 1427/1524/1859\n' +
        'f 1472/1569/1860 1984/2083/1860 1427/1524/1860 471/519/1860\n' +
        'f 466/514/1861 1475/1572/1861 1985/2084/1861 1422/1519/1861\n' +
        'f 1475/1572/1862 492/540/1862 1455/1552/1862 1985/2084/1862\n' +
        'f 1985/2084/1863 1455/1552/1863 490/538/1863 1473/1570/1863\n' +
        'f 1422/1519/1864 1985/2084/1864 1473/1570/1864 468/516/1864\n' +
        'f 491/539/1865 1456/1553/1865 1986/2085/1865 1474/1571/1865\n' +
        'f 1456/1553/1866 493/541/1866 1476/1573/1866 1986/2085/1866\n' +
        'f 1986/2085/1867 1476/1573/1867 467/515/1867 1423/1520/1867\n' +
        'f 1474/1571/1868 1986/2085/1868 1423/1520/1868 469/517/1868\n' +
        'f 464/512/1869 1459/1556/1869 1987/2086/1869 1418/1515/1869\n' +
        'f 492/540/1870 1475/1572/1870 1987/2086/1870 1459/1556/1870\n' +
        'f 466/514/1871 1418/1515/1871 1987/2086/1871 1475/1572/1871\n' +
        'f 467/515/1872 1476/1573/1872 1988/2087/1872 1419/1516/1872\n' +
        'f 493/541/1873 1462/1559/1873 1988/2087/1873 1476/1573/1873\n' +
        'f 465/513/1874 1419/1516/1874 1988/2087/1874 1462/1559/1874\n' +
        'f 392/428/1875 1299/1384/1875 1989/2088/1875 1477/1574/1875\n' +
        'f 1299/1384/1876 390/426/1876 1478/1575/1876 1989/2088/1876\n' +
        'f 1989/2088/1877 1478/1575/1877 504/552/1877 1479/1576/1877\n' +
        'f 1477/1574/1878 1989/2088/1878 1479/1576/1878 502/550/1878\n' +
        'f 505/553/1879 1481/1578/1879 1990/2089/1879 1480/1577/1879\n' +
        'f 1481/1578/1880 391/427/1880 1304/1389/1880 1990/2089/1880\n' +
        'f 1990/2089/1881 1304/1389/1881 393/429/1881 1482/1579/1881\n' +
        'f 1480/1577/1882 1990/2089/1882 1482/1579/1882 503/551/1882\n' +
        'f 394/430/1883 1293/1378/1883 1991/2090/1883 1483/1580/1883\n' +
        'f 1293/1378/1884 392/428/1884 1477/1574/1884 1991/2090/1884\n' +
        'f 1991/2090/1885 1477/1574/1885 502/550/1885 1484/1581/1885\n' +
        'f 1483/1580/1886 1991/2090/1886 1484/1581/1886 500/548/1886\n' +
        'f 503/551/1887 1482/1579/1887 1992/2091/1887 1485/1582/1887\n' +
        'f 1482/1579/1888 393/429/1888 1298/1383/1888 1992/2091/1888\n' +
        'f 1992/2091/1889 1298/1383/1889 395/431/1889 1486/1583/1889\n' +
        'f 1485/1582/1890 1992/2091/1890 1486/1583/1890 501/549/1890\n' +
        'f 396/432/1891 1287/1372/1891 1993/2092/1891 1487/1584/1891\n' +
        'f 1287/1372/1892 394/430/1892 1483/1580/1892 1993/2092/1892\n' +
        'f 1993/2092/1893 1483/1580/1893 500/548/1893 1488/1585/1893\n' +
        'f 1487/1584/1894 1993/2092/1894 1488/1585/1894 498/546/1894\n' +
        'f 501/549/1895 1486/1583/1895 1994/2093/1895 1489/1586/1895\n' +
        'f 1486/1583/1896 395/431/1896 1292/1377/1896 1994/2093/1896\n' +
        'f 1994/2093/1897 1292/1377/1897 397/433/1897 1490/1587/1897\n' +
        'f 1489/1586/1898 1994/2093/1898 1490/1587/1898 499/547/1898\n' +
        'f 398/435/1899 1281/1365/1899 1995/2094/1899 1491/1588/1899\n' +
        'f 1281/1365/1900 396/432/1900 1487/1584/1900 1995/2094/1900\n' +
        'f 1995/2094/1901 1487/1584/1901 498/546/1901 1492/1589/1901\n' +
        'f 1491/1588/1902 1995/2094/1902 1492/1589/1902 496/544/1902\n' +
        'f 499/547/1903 1490/1587/1903 1996/2095/1903 1493/1590/1903\n' +
        'f 1490/1587/1904 397/433/1904 1286/1371/1904 1996/2095/1904\n' +
        'f 1996/2095/1905 1286/1371/1905 399/437/1905 1494/1591/1905\n' +
        'f 1493/1590/1906 1996/2095/1906 1494/1591/1906 497/545/1906\n' +
        'f 400/439/1907 1275/1357/1907 1997/2096/1907 1495/1592/1907\n' +
        'f 1275/1357/1908 398/435/1908 1491/1588/1908 1997/2096/1908\n' +
        'f 1997/2096/1909 1491/1588/1909 496/544/1909 1496/1593/1909\n' +
        'f 1495/1592/1910 1997/2096/1910 1496/1593/1910 494/542/1910\n' +
        'f 497/545/1911 1494/1591/1911 1998/2097/1911 1497/1594/1911\n' +
        'f 1494/1591/1912 399/437/1912 1280/1363/1912 1998/2097/1912\n' +
        'f 1998/2097/1913 1280/1363/1913 401/441/1913 1498/1595/1913\n' +
        'f 1497/1594/1914 1998/2097/1914 1498/1595/1914 495/543/1914\n' +
        'f 388/422/1915 1268/1348/1915 1999/2098/1915 1499/1596/1915\n' +
        'f 1268/1348/1916 400/439/1916 1495/1592/1916 1999/2098/1916\n' +
        'f 1999/2098/1917 1495/1592/1917 494/542/1917 1500/1598/1917\n' +
        'f 1499/1596/1918 1999/2098/1918 1500/1598/1918 506/555/1918\n' +
        'f 495/543/1919 1498/1595/1919 2000/2099/1919 1501/1599/1919\n' +
        'f 1498/1595/1920 401/441/1920 1273/1354/1920 2000/2099/1920\n' +
        'f 2000/2099/1921 1273/1354/1921 389/425/1921 1502/1600/1921\n' +
        'f 1501/1599/1922 2000/2099/1922 1502/1600/1922 507/556/1922\n' +
        'f 494/542/1923 1503/1601/1923 2001/2100/1923 1500/1598/1923\n' +
        'f 1503/1601/1924 502/550/1924 1479/1576/1924 2001/2100/1924\n' +
        'f 2001/2100/1925 1479/1576/1925 504/552/1925 1504/1602/1925\n' +
        'f 1500/1598/1926 2001/2100/1926 1504/1602/1926 506/555/1926\n' +
        'f 505/553/1927 1480/1577/1927 2002/2101/1927 1505/1603/1927\n' +
        'f 1480/1577/1928 503/551/1928 1506/1604/1928 2002/2101/1928\n' +
        'f 2002/2101/1929 1506/1604/1929 495/543/1929 1501/1599/1929\n' +
        'f 1505/1603/1930 2002/2101/1930 1501/1599/1930 507/556/1930\n' +
        'f 494/542/1931 1496/1593/1931 2003/2102/1931 1503/1601/1931\n' +
        'f 1496/1593/1932 496/544/1932 1507/1605/1932 2003/2102/1932\n' +
        'f 2003/2102/1933 1507/1605/1933 500/548/1933 1484/1581/1933\n' +
        'f 1503/1601/1934 2003/2102/1934 1484/1581/1934 502/550/1934\n' +
        'f 501/549/1935 1508/1606/1935 2004/2103/1935 1485/1582/1935\n' +
        'f 1508/1606/1936 497/545/1936 1497/1594/1936 2004/2103/1936\n' +
        'f 2004/2103/1937 1497/1594/1937 495/543/1937 1506/1604/1937\n' +
        'f 1485/1582/1938 2004/2103/1938 1506/1604/1938 503/551/1938\n' +
        'f 496/544/1939 1492/1589/1939 2005/2104/1939 1507/1605/1939\n' +
        'f 498/546/1940 1488/1585/1940 2005/2104/1940 1492/1589/1940\n' +
        'f 500/548/1941 1507/1605/1941 2005/2104/1941 1488/1585/1941\n' +
        'f 501/549/1942 1489/1586/1942 2006/2105/1942 1508/1606/1942\n' +
        'f 499/547/1943 1493/1590/1943 2006/2105/1943 1489/1586/1943\n' +
        'f 497/545/1944 1508/1606/1944 2006/2105/1944 1493/1590/1944\n' +
        'f 314/338/1945 1233/1307/1945 2007/2106/1945 1509/1607/1945\n' +
        'f 1233/1307/1946 382/413/1946 1343/1431/1946 2007/2106/1946\n' +
        'f 2007/2106/1947 1343/1431/1947 388/423/1947 1499/1597/1947\n' +
        'f 1509/1607/1948 2007/2106/1948 1499/1597/1948 506/554/1948\n' +
        'f 389/425/1949 1348/1439/1949 2008/2107/1949 1502/1600/1949\n' +
        'f 1348/1439/1950 383/416/1950 1234/1309/1950 2008/2107/1950\n' +
        'f 2008/2107/1951 1234/1309/1951 315/341/1951 1510/1609/1951\n' +
        'f 1502/1600/1952 2008/2107/1952 1510/1609/1952 507/556/1952\n' +
        'f 314/339/1953 1509/1608/1953 2009/2108/1953 1253/1329/1953\n' +
        'f 1509/1608/1954 506/555/1954 1504/1602/1954 2009/2108/1954\n' +
        'f 2009/2108/1955 1504/1602/1955 504/552/1955 1511/1610/1955\n' +
        'f 1253/1329/1956 2009/2108/1956 1511/1610/1956 322/351/1956\n' +
        'f 505/553/1957 1505/1603/1957 2010/2109/1957 1512/1611/1957\n' +
        'f 1505/1603/1958 507/556/1958 1510/1609/1958 2010/2109/1958\n' +
        'f 2010/2109/1959 1510/1609/1959 315/341/1959 1258/1335/1959\n' +
        'f 1512/1611/1960 2010/2109/1960 1258/1335/1960 323/353/1960\n' +
        'f 320/347/1961 1261/1339/1961 2011/2110/1961 1337/1424/1961\n' +
        'f 1261/1339/1962 322/351/1962 1511/1610/1962 2011/2110/1962\n' +
        'f 2011/2110/1963 1511/1610/1963 504/552/1963 1478/1575/1963\n' +
        'f 1337/1424/1964 2011/2110/1964 1478/1575/1964 390/426/1964\n' +
        'f 505/553/1965 1512/1611/1965 2012/2111/1965 1481/1578/1965\n' +
        'f 1512/1611/1966 323/353/1966 1264/1343/1966 2012/2111/1966\n' +
        'f 2012/2111/1967 1264/1343/1967 321/349/1967 1340/1427/1967\n' +
        'f 1481/1578/1968 2012/2111/1968 1340/1427/1968 391/427/1968\n';
}

export function standard2Dshape_obj_string() {
    return '# Blender 3.5.1\n' +
        '# www.blender.org\n' +
        'mtllib standard2D.mtl\n' +
        'o Plane\n' +
        'v -1.060161 -1.000000 0.001838\n' +
        'v 0.939839 -0.912494 0.001838\n' +
        'v -0.956247 0.956247 0.001838\n' +
        'v 1.000000 1.000000 0.001838\n' +
        'v -1.054692 0.000000 0.001838\n' +
        'v 0.000000 -0.945309 0.001838\n' +
        'v 1.027346 0.021877 0.001838\n' +
        'v -0.016407 0.950778 0.001838\n' +
        'v 0.000000 0.000000 0.001838\n' +
        'v -0.923432 -0.516407 0.001838\n' +
        'v 0.505469 -0.928901 0.001838\n' +
        'v 1.000000 0.500000 0.001838\n' +
        'v -0.494531 1.092976 0.001838\n' +
        'v -1.076568 0.510938 0.001838\n' +
        'v -0.494531 -0.917963 0.001838\n' +
        'v 0.950778 -0.483593 0.001838\n' +
        'v 0.500000 1.000000 0.001838\n' +
        'v 0.000000 0.500000 0.001838\n' +
        'v 0.000000 -0.500000 0.001838\n' +
        'v -0.500000 0.000000 0.001838\n' +
        'v 0.500000 0.000000 0.001838\n' +
        'v 0.500000 -0.500000 0.001838\n' +
        'v -0.500000 -0.500000 0.001838\n' +
        'v -0.500000 0.500000 0.001838\n' +
        'v 0.500000 0.500000 0.001838\n' +
        'v -1.054692 -0.771877 0.001838\n' +
        'v 0.750000 -1.000000 0.001838\n' +
        'v 1.213297 0.684370 0.001838\n' +
        'v -0.750000 1.000000 0.001838\n' +
        'v -1.027346 0.271877 0.001838\n' +
        'v -0.250000 -1.000000 0.001838\n' +
        'v 1.065630 -0.244531 0.001838\n' +
        'v 0.250000 0.928901 0.001838\n' +
        'v 0.000000 0.750000 0.001838\n' +
        'v 0.000000 -0.250000 0.001838\n' +
        'v -0.750000 0.000000 0.001838\n' +
        'v 0.250000 0.000000 0.001838\n' +
        'v -0.923432 -0.244531 0.001838\n' +
        'v 0.250000 -1.000000 0.001838\n' +
        'v 0.934370 0.250000 0.001838\n' +
        'v -0.233593 1.065630 0.001838\n' +
        'v -1.000000 0.750000 0.001838\n' +
        'v -0.750000 -1.000000 0.001838\n' +
        'v 1.000000 -0.750000 0.001838\n' +
        'v 0.744531 1.114852 0.001838\n' +
        'v 0.000000 0.250000 0.001838\n' +
        'v 0.000000 -0.750000 0.001838\n' +
        'v -0.250000 0.000000 0.001838\n' +
        'v 0.750000 0.000000 0.001838\n' +
        'v 0.500000 -0.250000 0.001838\n' +
        'v 0.500000 -0.750000 0.001838\n' +
        'v 0.250000 -0.500000 0.001838\n' +
        'v 0.750000 -0.500000 0.001838\n' +
        'v -0.500000 -0.250000 0.001838\n' +
        'v -0.500000 -0.750000 0.001838\n' +
        'v -0.750000 -0.500000 0.001838\n' +
        'v -0.250000 -0.500000 0.001838\n' +
        'v -0.500000 0.750000 0.001838\n' +
        'v -0.500000 0.250000 0.001838\n' +
        'v -0.750000 0.500000 0.001838\n' +
        'v -0.250000 0.500000 0.001838\n' +
        'v 0.500000 0.750000 0.001838\n' +
        'v 0.500000 0.250000 0.001838\n' +
        'v 0.250000 0.500000 0.001838\n' +
        'v 0.750000 0.500000 0.001838\n' +
        'v 0.750000 0.250000 0.001838\n' +
        'v 0.250000 0.250000 0.001838\n' +
        'v 0.250000 0.750000 0.001838\n' +
        'v -0.250000 0.250000 0.001838\n' +
        'v -0.750000 0.250000 0.001838\n' +
        'v -0.750000 0.750000 0.001838\n' +
        'v -0.250000 -0.750000 0.001838\n' +
        'v -0.750000 -0.750000 0.001838\n' +
        'v -0.750000 -0.250000 0.001838\n' +
        'v 0.750000 -0.750000 0.001838\n' +
        'v 0.250000 -0.750000 0.001838\n' +
        'v 0.250000 -0.250000 0.001838\n' +
        'v 0.750000 -0.250000 0.001838\n' +
        'v -0.250000 -0.250000 0.001838\n' +
        'v -0.250000 0.750000 0.001838\n' +
        'v 0.750000 0.750000 0.001838\n' +
        'vn -0.0000 -0.0000 1.0000\n' +
        'vt 0.000000 0.000000\n' +
        'vt 1.000000 0.000000\n' +
        'vt 0.000000 1.000000\n' +
        'vt 1.000000 1.000000\n' +
        'vt 0.000000 0.500000\n' +
        'vt 0.500000 0.000000\n' +
        'vt 1.000000 0.500000\n' +
        'vt 0.500000 1.000000\n' +
        'vt 0.500000 0.500000\n' +
        'vt 0.000000 0.250000\n' +
        'vt 0.750000 0.000000\n' +
        'vt 1.000000 0.750000\n' +
        'vt 0.250000 1.000000\n' +
        'vt 0.000000 0.750000\n' +
        'vt 0.250000 0.000000\n' +
        'vt 1.000000 0.250000\n' +
        'vt 0.750000 1.000000\n' +
        'vt 0.500000 0.750000\n' +
        'vt 0.500000 0.250000\n' +
        'vt 0.250000 0.500000\n' +
        'vt 0.750000 0.500000\n' +
        'vt 0.750000 0.250000\n' +
        'vt 0.250000 0.250000\n' +
        'vt 0.250000 0.750000\n' +
        'vt 0.750000 0.750000\n' +
        'vt 0.000000 0.125000\n' +
        'vt 0.875000 0.000000\n' +
        'vt 1.000000 0.875000\n' +
        'vt 0.125000 1.000000\n' +
        'vt 0.000000 0.625000\n' +
        'vt 0.375000 0.000000\n' +
        'vt 1.000000 0.375000\n' +
        'vt 0.625000 1.000000\n' +
        'vt 0.500000 0.875000\n' +
        'vt 0.500000 0.375000\n' +
        'vt 0.125000 0.500000\n' +
        'vt 0.625000 0.500000\n' +
        'vt 0.000000 0.375000\n' +
        'vt 0.625000 0.000000\n' +
        'vt 1.000000 0.625000\n' +
        'vt 0.375000 1.000000\n' +
        'vt 0.000000 0.875000\n' +
        'vt 0.125000 0.000000\n' +
        'vt 1.000000 0.125000\n' +
        'vt 0.875000 1.000000\n' +
        'vt 0.500000 0.625000\n' +
        'vt 0.500000 0.125000\n' +
        'vt 0.375000 0.500000\n' +
        'vt 0.875000 0.500000\n' +
        'vt 0.750000 0.375000\n' +
        'vt 0.750000 0.125000\n' +
        'vt 0.625000 0.250000\n' +
        'vt 0.875000 0.250000\n' +
        'vt 0.250000 0.375000\n' +
        'vt 0.250000 0.125000\n' +
        'vt 0.125000 0.250000\n' +
        'vt 0.375000 0.250000\n' +
        'vt 0.250000 0.875000\n' +
        'vt 0.250000 0.625000\n' +
        'vt 0.125000 0.750000\n' +
        'vt 0.375000 0.750000\n' +
        'vt 0.750000 0.875000\n' +
        'vt 0.750000 0.625000\n' +
        'vt 0.625000 0.750000\n' +
        'vt 0.875000 0.750000\n' +
        'vt 0.875000 0.625000\n' +
        'vt 0.625000 0.625000\n' +
        'vt 0.625000 0.875000\n' +
        'vt 0.375000 0.625000\n' +
        'vt 0.125000 0.625000\n' +
        'vt 0.125000 0.875000\n' +
        'vt 0.375000 0.125000\n' +
        'vt 0.125000 0.125000\n' +
        'vt 0.125000 0.375000\n' +
        'vt 0.875000 0.125000\n' +
        'vt 0.625000 0.125000\n' +
        'vt 0.625000 0.375000\n' +
        'vt 0.875000 0.375000\n' +
        'vt 0.375000 0.375000\n' +
        'vt 0.375000 0.875000\n' +
        'vt 0.875000 0.875000\n' +
        's 0\n' +
        'f 81/81/1 28/28/1 4/4/1 45/45/1\n' +
        'f 80/80/1 34/34/1 8/8/1 41/41/1\n' +
        'f 79/79/1 35/35/1 9/9/1 48/48/1\n' +
        'f 78/78/1 32/32/1 7/7/1 49/49/1\n' +
        'f 77/77/1 50/50/1 21/21/1 37/37/1\n' +
        'f 76/76/1 51/51/1 22/22/1 52/52/1\n' +
        'f 75/75/1 44/44/1 16/16/1 53/53/1\n' +
        'f 74/74/1 54/54/1 20/20/1 36/36/1\n' +
        'f 73/73/1 55/55/1 23/23/1 56/56/1\n' +
        'f 72/72/1 47/47/1 19/19/1 57/57/1\n' +
        'f 71/71/1 58/58/1 13/13/1 29/29/1\n' +
        'f 70/70/1 59/59/1 24/24/1 60/60/1\n' +
        'f 69/69/1 46/46/1 18/18/1 61/61/1\n' +
        'f 68/68/1 62/62/1 17/17/1 33/33/1\n' +
        'f 67/67/1 63/63/1 25/25/1 64/64/1\n' +
        'f 66/66/1 40/40/1 12/12/1 65/65/1\n' +
        'f 63/63/1 66/66/1 65/65/1 25/25/1\n' +
        'f 21/21/1 49/49/1 66/66/1 63/63/1\n' +
        'f 49/49/1 7/7/1 40/40/1 66/66/1\n' +
        'f 46/46/1 67/67/1 64/64/1 18/18/1\n' +
        'f 9/9/1 37/37/1 67/67/1 46/46/1\n' +
        'f 37/37/1 21/21/1 63/63/1 67/67/1\n' +
        'f 34/34/1 68/68/1 33/33/1 8/8/1\n' +
        'f 18/18/1 64/64/1 68/68/1 34/34/1\n' +
        'f 64/64/1 25/25/1 62/62/1 68/68/1\n' +
        'f 59/59/1 69/69/1 61/61/1 24/24/1\n' +
        'f 20/20/1 48/48/1 69/69/1 59/59/1\n' +
        'f 48/48/1 9/9/1 46/46/1 69/69/1\n' +
        'f 30/30/1 70/70/1 60/60/1 14/14/1\n' +
        'f 5/5/1 36/36/1 70/70/1 30/30/1\n' +
        'f 36/36/1 20/20/1 59/59/1 70/70/1\n' +
        'f 42/42/1 71/71/1 29/29/1 3/3/1\n' +
        'f 14/14/1 60/60/1 71/71/1 42/42/1\n' +
        'f 60/60/1 24/24/1 58/58/1 71/71/1\n' +
        'f 55/55/1 72/72/1 57/57/1 23/23/1\n' +
        'f 15/15/1 31/31/1 72/72/1 55/55/1\n' +
        'f 31/31/1 6/6/1 47/47/1 72/72/1\n' +
        'f 26/26/1 73/73/1 56/56/1 10/10/1\n' +
        'f 1/1/1 43/43/1 73/73/1 26/26/1\n' +
        'f 43/43/1 15/15/1 55/55/1 73/73/1\n' +
        'f 38/38/1 74/74/1 36/36/1 5/5/1\n' +
        'f 10/10/1 56/56/1 74/74/1 38/38/1\n' +
        'f 56/56/1 23/23/1 54/54/1 74/74/1\n' +
        'f 51/51/1 75/75/1 53/53/1 22/22/1\n' +
        'f 11/11/1 27/27/1 75/75/1 51/51/1\n' +
        'f 27/27/1 2/2/1 44/44/1 75/75/1\n' +
        'f 47/47/1 76/76/1 52/52/1 19/19/1\n' +
        'f 6/6/1 39/39/1 76/76/1 47/47/1\n' +
        'f 39/39/1 11/11/1 51/51/1 76/76/1\n' +
        'f 35/35/1 77/77/1 37/37/1 9/9/1\n' +
        'f 19/19/1 52/52/1 77/77/1 35/35/1\n' +
        'f 52/52/1 22/22/1 50/50/1 77/77/1\n' +
        'f 50/50/1 78/78/1 49/49/1 21/21/1\n' +
        'f 22/22/1 53/53/1 78/78/1 50/50/1\n' +
        'f 53/53/1 16/16/1 32/32/1 78/78/1\n' +
        'f 54/54/1 79/79/1 48/48/1 20/20/1\n' +
        'f 23/23/1 57/57/1 79/79/1 54/54/1\n' +
        'f 57/57/1 19/19/1 35/35/1 79/79/1\n' +
        'f 58/58/1 80/80/1 41/41/1 13/13/1\n' +
        'f 24/24/1 61/61/1 80/80/1 58/58/1\n' +
        'f 61/61/1 18/18/1 34/34/1 80/80/1\n' +
        'f 62/62/1 81/81/1 45/45/1 17/17/1\n' +
        'f 25/25/1 65/65/1 81/81/1 62/62/1\n' +
        'f 65/65/1 12/12/1 28/28/1 81/81/1\n';
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function get_default_lil_gui(width='200px') {
    const gui = new lil.GUI();
    gui.domElement.style.opacity = '0.9'
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.top = '60px';
    gui.domElement.style.left = '10px';
    gui.domElement.style.width = width;
    return gui;
}

export function refresh_displays(gui) {
    let controllers = gui.controllersRecursive();
    controllers.forEach(controller => controller.updateDisplay());
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function set_material_color_gradient_based_on_height(object) {
    const positionAttribute = object.geometry.getAttribute('position');

    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < positionAttribute.count; i++) {
        const y = positionAttribute.getY(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    const vertexShader = `
  varying vec3 vColor;

  void main() {
    float normalizedY = (position.y - ${minY.toFixed(2)}) / (${(maxY - minY).toFixed(2)});
    vColor = mix(vec3(0.3, 0.3, 0.7), vec3(0.678, 0.847, 0.902), normalizedY);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

    const fragmentShader = `
  varying vec3 vColor;

  void main() {
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.DoubleSide
    });

    object.material = material;
}

export function set_material_color_gradient_charts(object) {

    const vertexShader = `
    // Vertex Shader
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

    const fragmentShader = `
    // Fragment Shader
    varying vec2 vUv;
    
    // Random function
    vec2 random2(vec2 st) {
        st = vec2(dot(st, vec2(127.1,311.7)),
                  dot(st, vec2(269.5,183.3)));
        return -1.0 + 2.0 * fract(sin(st) * 43758.5453123);
    }
    
    // Noise function
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
    
        // Four corners in 2D of a tile
        float a = dot(random2(i), f);
        float b = dot(random2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
        float c = dot(random2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
        float d = dot(random2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
    
        // Smooth Interpolation
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    void main() {
        // Scale the noise function
        float scale = 4.0;
        float pattern = noise(vUv * scale);
    
        // Use the noise to mix between two colors
        vec3 colorA = vec3(0.9, 0.1, 0.1); // Red color
        vec3 colorB = vec3(0.1, 0.1, 0.9); // Blue color
        vec3 color = mix(colorA, colorB, pattern);
    
        gl_FragColor = vec4(color, 1.0);
    }
`;

    let material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader
    });

    object.material = material;
}

export function set_material_color_from_texture(object, path_to_texture) {
    let loader = new THREE.TextureLoader();

    let texture = loader.load(path_to_texture);

    let material = new THREE.MeshBasicMaterial({ map: texture });

    object.material = material;
}

