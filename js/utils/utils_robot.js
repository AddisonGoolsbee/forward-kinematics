/**
 * Author: Danny Rakita
 * Description: For CPSC-487-587 3D Spatial Modeling and Computing at Yale University
 */

import {get_x_rotation_so3_matrix, get_y_rotation_so3_matrix, get_z_rotation_so3_matrix} from "./utils_euler_angles.js";
import {mul_matrix_matrix} from "./utils_math.js";
import {mul_wxyz_quaternions} from "./utils_quaternion.js";
import {
    set_object_pose_from_scalar_vector_quaternion_and_position,
    set_object_pose_from_SE3_matrix,
    set_object_pose_from_SO3_matrix_and_position,
    set_object_pose_from_wxyz_quaternion_and_position
} from "./utils_transforms.js";

function get_rpy_SO3_matrix(rpy) {
    let rx = get_x_rotation_so3_matrix(rpy[0]);
    let ry = get_y_rotation_so3_matrix(rpy[1]);
    let rz = get_z_rotation_so3_matrix(rpy[2]);

    return mul_matrix_matrix(mul_matrix_matrix(rx, ry), rz);
}

function get_rpy_wxyz_quaternion(rpy) {
    let rx = [ Math.cos(rpy[0]/2), Math.sin(rpy[0]/2), 0, 0 ];
    let ry = [ Math.cos(rpy[1]/2), 0, Math.sin(rpy[1]/2), 0 ];
    let rz = [ Math.cos(rpy[2]/2), 0, 0, Math.sin(rpy[2]/2) ];

    return mul_wxyz_quaternions(mul_wxyz_quaternions(rx, ry), rz);
}

function get_xyz_rpy_SE3_matrix(xyz, rpy) {
    let s = get_rpy_SO3_matrix(rpy);

    return [
        [s[0][0], s[0][1], s[0][2], xyz[0]],
        [s[1][0], s[1][1], s[1][2], xyz[1]],
        [s[2][0], s[2][1], s[2][2], xyz[2]],
        [0,0,0,1] ];
}

export class RobotJointBaseClass {
    constructor(joint_name, joint_idx, parent_link_idx, child_link_idx, xyz=[0,0,0], rpy=[0,0,0]) {
        if (new.target === RobotJointBaseClass) {
            throw new Error("RobotJointBaseClass is a template class and cannot be instantiated directly.");
        }

        this.joint_name = joint_name;
        this.joint_idx = joint_idx;
        this.parent_link_idx = parent_link_idx;
        this.child_link_idx = child_link_idx;
        this.xyz = xyz;
        this.xyz_vec = [[xyz[0]], [xyz[1]], [xyz[2]]];
        this.rpy = rpy;
        this.rpy_SO3_matrix = get_rpy_SO3_matrix(rpy);
        this.rpy_wxyz_quaternion = get_rpy_wxyz_quaternion(rpy);
        this.xyz_rpy_SE3_matrix = get_xyz_rpy_SE3_matrix(xyz, rpy);
        this.joint_type_string = this.get_joint_type_string();
        this.joint_num_dofs = this.get_joint_num_dofs();
    }

    get_joint_type_string() {
        throw new Error("Method 'get_joint_type_string()' must be implemented in the derived class.");
    }

    get_joint_num_dofs() {
        throw new Error("Method 'get_joint_num_dofs()' must be implemented in the derived class.");
    }
}

export class RobotJointRevolute extends RobotJointBaseClass {
    constructor(joint_name, joint_idx, parent_link_idx, child_link_idx, dof_idx, axis, lower_bound, upper_bound, xyz=[0,0,0], rpy=[0,0,0]) {
        super(joint_name, joint_idx, parent_link_idx, child_link_idx, xyz, rpy);

        this.dof_idx = dof_idx;
        this.axis = axis;
        this.lower_bound = lower_bound;
        this.upper_bound = upper_bound;
    }

    get_joint_type_string() {
        return 'revolute';
    }

    get_joint_num_dofs() {
        return 1;
    }
}

export class RobotJointPrismatic extends RobotJointBaseClass {
    constructor(joint_name, joint_idx, parent_link_idx, child_link_idx, dof_idx, axis, lower_bound, upper_bound, xyz=[0,0,0], rpy=[0,0,0]) {
        super(joint_name, joint_idx, parent_link_idx, child_link_idx, xyz, rpy);

        this.dof_idx = dof_idx;
        this.axis = axis;
        this.lower_bound = lower_bound;
        this.upper_bound = upper_bound;
    }

    get_joint_type_string() {
        return 'prismatic';
    }

    get_joint_num_dofs() {
        return 1;
    }
}

export class RobotJointFixed extends RobotJointBaseClass {
    constructor(joint_name, joint_idx, parent_link_idx, child_link_idx, xyz=[0,0,0], rpy=[0,0,0]) {
        super(joint_name, joint_idx, parent_link_idx, child_link_idx, xyz, rpy);
    }

    get_joint_type_string() {
        return 'fixed';
    }

    get_joint_num_dofs() {
        return 0;
    }
}

export class RobotJointFloating extends RobotJointBaseClass {
    constructor(joint_name, joint_idx, parent_link_idx, child_link_idx, rotation_dof_idxs, translation_dof_idxs, xyz=[0,0,0], rpy=[0,0,0]) {
        super(joint_name, joint_idx, parent_link_idx, child_link_idx, xyz, rpy);

        this.rotation_dof_idxs = rotation_dof_idxs;
        this.translation_dof_idxs = translation_dof_idxs;
    }

    get_joint_type_string() {
        return 'floating';
    }

    get_joint_num_dofs() {
        return 6;
    }
}

export class RobotLink {
    constructor(link_name, link_idx, parent_joint_idx, children_joint_idxs, parent_link_idx, children_link_idxs, mesh_name='') {
        this.link_name = link_name;
        this.link_idx = link_idx;
        this.parent_joint_idx = parent_joint_idx;
        this.children_joint_idxs = children_joint_idxs;
        this.parent_link_idx = parent_link_idx;
        this.children_link_idxs = children_link_idxs;
        this.mesh_name = mesh_name;
    }
}

export class RobotBaseClass {
    constructor() {
        if (new.target === RobotBaseClass) {
            throw new Error("RobotBaseClass is a template class and cannot be instantiated directly.");
        }

        this.robot_links_mesh_directory_name = this.get_robot_links_mesh_directory_name();
        this.robot_name = this.get_robot_name();
        this.joints = this.get_robot_joints();
        this.links = this.get_robot_links();
        this.kinematic_hierarchy = this.get_robot_kinematic_hierarchy();
        this.already_spawned = false;
        this.link_to_mesh_idxs_mapping = [];

        this.link_to_kinematic_hierarchy_order_idx = [];
        this.links.forEach( () => { this.link_to_kinematic_hierarchy_order_idx.push(0); } );
        let order_idx = 0;
        this.kinematic_hierarchy.forEach(layer => {
            layer.forEach(link_idx => {
                this.link_to_kinematic_hierarchy_order_idx[link_idx] = order_idx;
                order_idx++;
            });
        });
    }

    async spawn_robot(engine) {
        if(this.already_spawned) { return; }

        this.already_spawned = true;

        this.link_to_mesh_idxs_mapping = [];

        for(let i=0; i < this.links.length; i++) {
            this.link_to_mesh_idxs_mapping.push([]);
        }

        for (const link of this.links) {
            let link_mesh_name = link.mesh_name;
            if (link_mesh_name !== '') {
                let link_idx = link.link_idx;
                let fp = '../' + this.robot_links_mesh_directory_name + '/' + link.mesh_name;
                let idxs = await engine.add_gltf_mesh_object(fp);
                // console.log(idxs);
                idxs.forEach(idx => {
                    this.link_to_mesh_idxs_mapping[link_idx].push(idx);
                })
            }
        }
    }

    set_link_mesh_pose_from_SE3_matrix(engine, link_idx, SE3_matrix) {
        let idxs = this.link_to_mesh_idxs_mapping[link_idx];
        idxs.forEach(idx => {
            set_object_pose_from_SE3_matrix(engine, idx, SE3_matrix);
        });
    }

    set_link_mesh_pose_from_SO3_matrix_and_position(engine, link_idx, SO3_matrix, position) {
        let idxs = this.link_to_mesh_idxs_mapping[link_idx];
        idxs.forEach(idx => {
            set_object_pose_from_SO3_matrix_and_position(engine, idx, SO3_matrix, position);
        });
    }

    set_link_mesh_pose_from_wxyz_quaternion_and_position(engine, link_idx, wxyz_quaternion, position) {
        let idxs = this.link_to_mesh_idxs_mapping[link_idx];
        idxs.forEach(idx => {
            set_object_pose_from_wxyz_quaternion_and_position(engine, idx, wxyz_quaternion, position);
        });
    }

    set_link_mesh_pose_from_scalar_vector_quaternion_and_position(engine, link_idx, scalar_vector_quaternion, position) {
        let idxs = this.link_to_mesh_idxs_mapping[link_idx];
        idxs.forEach(idx => {
            set_object_pose_from_scalar_vector_quaternion_and_position(engine, idx, scalar_vector_quaternion, position);
        });
    }

    set_wireframe_visibility(engine, visible) {
        this.link_to_mesh_idxs_mapping.forEach(link_idxs => {
            link_idxs.forEach(idx => {
                engine.set_mesh_object_wireframe_visibility(idx, visible);
            });
        });
    }

    set_mesh_visibility(engine, visible) {
        this.link_to_mesh_idxs_mapping.forEach(link_idxs => {
            link_idxs.forEach(idx => {
                engine.mesh_objects[idx].visible = visible;
            });
        });
    }

    set_link_wireframe_visibility(engine, link_idx, visible) {
        let link_idxs = this.link_to_mesh_idxs_mapping[link_idx];
        link_idxs.forEach(idx => {
            engine.mesh_object_wireframes[idx].visible = visible;
        });
    }

    set_link_mesh_visibility(engine, link_idx, visible) {
        let link_idxs = this.link_to_mesh_idxs_mapping[link_idx];
        link_idxs.forEach(idx => {
            engine.mesh_objects[idx].visible = visible;
        });
    }

    get_robot_links_mesh_directory_name() {
        throw new Error("Method 'get_robot_links_mesh_directory_name()' must be implemented in the derived class.");
    }

    get_robot_name() {
        throw new Error("Method 'get_robot_name()' must be implemented in the derived class.");
    }

    get_robot_joints() {
        throw new Error("Method 'get_robot_joints()' must be implemented in the derived class.");
    }

    get_robot_links() {
        throw new Error("Method 'get_robot_links()' must be implemented in the derived class.");
    }

    get_robot_kinematic_hierarchy() {
        throw new Error("Method 'get_robot_kinematic_hierarchy()' must be implemented in the derived class.");
    }

    num_links() {
        return this.links.length;
    }

    num_joints() {
        return this.joints.length;
    }

    num_dofs() {
        let total = 0;
        this.joints.forEach(joint=> {
           total += joint.joint_num_dofs;
        });
        return total;
    }
}

export class XArm7Robot extends RobotBaseClass {
    constructor() {
        super();
    }

    get_robot_links_mesh_directory_name() {
        return 'xarm7_robot_meshes';
    }

    get_robot_name() {
        return 'XArm7';
    }

    get_robot_joints() {
        let joint0 = new RobotJointFixed('world_joint', 0, 0, 1, [0,0,0], [0,0,0]);
        let joint1 = new RobotJointPrismatic('linear_track_joint', 1, 1, 2, 0, [[0],[1],[0]], 0.0, 0.7, [-0.038245, -0.34349, 0.064988], [0,0,0]);
        let joint2 = new RobotJointFixed('linear_track_connector_joint', 2, 2, 3, [0,0,0], [0,0,0]);
        let joint3 = new RobotJointRevolute('joint1', 3, 3, 4, 1, [[0],[0],[1]],-6.283185307179586, 6.283185307179586, [0.0, 0.0, 0.267] , [0,0,0]);
        let joint4 = new RobotJointRevolute('joint2', 4, 4, 5, 2, [[0],[0],[1]],-2.059, 2.0944, [0.0, 0.0, 0.0] , [-1.5708, 0.0, 0.0]);
        let joint5 = new RobotJointRevolute('joint3', 5, 5, 6, 3, [[0],[0],[1]],-6.283185307179586, 6.283185307179586, [0.0, -0.293, 0.0] , [1.5708, 0.0, 0.0]);
        let joint6 = new RobotJointRevolute('joint4', 6, 6, 7, 4, [[0],[0],[1]],-0.19198, 3.927, [0.0525, 0.0, 0.0] , [1.5708, 0.0, 0.0]);
        let joint7 = new RobotJointRevolute('joint5', 7, 7, 8, 5, [[0],[0],[1]],-6.283185307179586, 6.283185307179586, [0.0775, -0.3425, 0.0], [1.5708, 0.0, 0.0]);
        let joint8 = new RobotJointRevolute('joint6', 8, 8, 9, 6, [[0],[0],[1]],-1.69297, 3.141592653589793, [0.0, 0.0, 0.0], [1.5708, 0.0, 0.0]);
        let joint9 = new RobotJointRevolute('joint7', 9, 9, 10, 7, [[0],[0],[1]],-6.283185307179586, 6.283185307179586, [0.076, 0.097, 0.0] , [-1.5708, 0.0, 0.0]);
        let joint10 = new RobotJointFixed('joint_eef', 10, 10, 11, [0,0,0], [0,0,0]);
        let joint11 = new RobotJointFixed('gripper_fix', 11, 11, 12, [0,0,0], [0,0,0]);
        let joint12 = new RobotJointFixed('drive_joint', 12, 12, 13, [0.0, 0.035, 0.059098], [0,0,0]);
        let joint13 = new RobotJointFixed('left_finger_joint', 13, 13, 14, [0.0, 0.035465, 0.042039] , [0,0,0]);
        let joint14 = new RobotJointFixed('left_inner_knuckle_joint', 14, 12, 15, [0.0, 0.02, 0.074098] , [0,0,0]);
        let joint15 = new RobotJointFixed('right_outer_knuckle_joint', 15, 12, 16, [0.0, -0.035, 0.059098] , [0,0,0]);
        let joint16 = new RobotJointFixed('right_finger_joint', 16, 16, 17, [0.0, -0.035465, 0.042039], [0,0,0]);
        let joint17 = new RobotJointFixed('right_inner_knuckle_joint', 17, 12, 18, [0.0, -0.02, 0.074098], [0,0,0]);
        let joint18 = new RobotJointFixed('joint_tcp', 18, 12, 19,  [0.0, 0.0, 0.172], [0,0,0]);

        return [joint0, joint1, joint2, joint3, joint4, joint5, joint6, joint7, joint8, joint9, joint10, joint11, joint12, joint13, joint14, joint15, joint16, joint17, joint18];
    }

    get_robot_links() {
        let link0 = new RobotLink('world', 0, null, [0], null, [1]);
        let link1 = new RobotLink('linear_motor_rail', 1, 0, [1], 0, [2], 'linear_motor_rail.glb');
        let link2 = new RobotLink('linear_motor_platform', 2, 1, [2], 1, [3], 'linear_motor_platform.glb');
        let link3 = new RobotLink('link_base', 3, 2, [3], 2, [4], 'link_base.glb');
        let link4 = new RobotLink('link1', 4, 3, [4], 3, [5], 'link1.glb');
        let link5 = new RobotLink('link2', 5, 4, [5], 4, [6], 'link2.glb');
        let link6 = new RobotLink('link3', 6, 5, [6], 5, [7], 'link3.glb');
        let link7 = new RobotLink('link4', 7, 6, [7], 6, [8], 'link4.glb');
        let link8 = new RobotLink('link5', 8, 7, [8], 7, [9], 'link5.glb');
        let link9 = new RobotLink('link6', 9, 8, [9], 8, [10], 'link6.glb');
        let link10 = new RobotLink('link7', 10, 9, [10], 9, [11], 'link7.glb');
        let link11 = new RobotLink('link_eef', 11, 10, [11], 10, [12]);
        let link12 = new RobotLink('xarm_gripper_base_link', 12, 11, [12, 14, 15, 17, 18], 11, [13, 15, 16, 18, 19], 'base_link.glb');
        let link13 = new RobotLink('left_outer_knuckle', 13, 12, [13], 12, [14], 'left_outer_knuckle.glb');
        let link14 = new RobotLink('left_finger', 14, 13, [], 13, [], 'left_finger.glb');
        let link15 = new RobotLink('left_inner_knuckle', 15, 14, [], 12, [], 'left_inner_knuckle.glb');
        let link16 = new RobotLink('right_outer_knuckle', 16, 15, [16], 12, [17], 'right_outer_knuckle.glb');
        let link17 = new RobotLink('right_finger', 17, 16, [], 16, [], 'right_finger.glb');
        let link18 = new RobotLink('right_inner_knuckle', 18, 17, [], 12, [], 'right_inner_knuckle.glb');
        let link19 = new RobotLink('link_tcp', 19, 18, [], 12, []);

        return [link0, link1, link2, link3, link4, link5, link6, link7, link8, link9, link10, link11, link12, link13, link14, link15, link16, link17, link18, link19];
    }

    get_robot_kinematic_hierarchy() {
        return [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13, 15, 16, 18, 19], [14, 17]];
    }
}

export class Z1Robot extends RobotBaseClass {
    constructor() {
        super();
    }

    get_robot_links_mesh_directory_name() {
        return 'unitree_robot_meshes';
    }

    get_robot_name() {
        return 'Z1';
    }

    get_robot_joints() {
        let joint1 = new RobotJointFixed('base_static_joint', 0, 0, 1, [0,0,0], [0,0,0]);
        let joint2 = new RobotJointRevolute('joint1', 1, 1, 2, 0, [0,0,1], -2.6179938779914944, 2.6179938779914944,  [0.0, 0.0, 0.0585], [0,0,0]);
        let joint3 = new RobotJointRevolute('joint2', 2, 2, 3, 1, [0,1,0], 0, 2.9670597283903604, [0.0, 0.0, 0.045], [0,0,0]);
        let joint4 = new RobotJointRevolute('joint3', 3, 3, 4, 2, [0,1,0], -2.8797932657906435, 0, [-0.35, 0.0, 0.0], [0,0,0]);
        let joint5 = new RobotJointRevolute('joint4', 4, 4, 5, 3, [0,1,0], -1.5184364492350666, 1.5184364492350666, [0.218, 0.0, 0.057], [0,0,0]);
        let joint6 = new RobotJointRevolute('joint5', 5, 5, 6, 4, [0,0,1], -1.3439035240356338, 1.3439035240356338, [0.07, 0.0, 0.0], [0,0,0]);
        let joint7 = new RobotJointRevolute('joint6', 6, 6, 7, 5, [1,0,0], -2.792526803190927, 2.792526803190927, [0.0492, 0.0, 0.0], [0,0,0]);
        let joint8 = new RobotJointFixed('gripperStator', 7, 7, 8, [0.051,0,0], [0,0,0]);
        let joint9 = new RobotJointFixed('jointGripper', 8, 8, 9, [0.049,0,0], [0,-0.5,0]);

        return [joint1, joint2, joint3, joint4, joint5, joint6, joint7, joint8, joint9];
    }

    get_robot_links() {
        let link0 = new RobotLink('world', 0, null, [0], null, [1]);
        let link1 = new RobotLink('link00', 1, 0, [1], 0, [2], 'z1_Link00.glb');
        let link2 = new RobotLink('link01', 2, 1, [2], 1, [3], 'z1_Link01.glb');
        let link3 = new RobotLink('link02', 3, 2, [3], 2, [4], 'z1_Link02.glb');
        let link4 = new RobotLink('link03', 4, 3, [4], 3, [5], 'z1_Link03.glb');
        let link5 = new RobotLink('link04', 5, 4, [5], 4, [6], 'z1_Link04.glb');
        let link6 = new RobotLink('link05', 6, 5, [6], 5, [7], 'z1_Link05.glb');
        let link7 = new RobotLink('link06', 7, 6, [7], 6, [8], 'z1_Link06.glb');
        let link8 = new RobotLink('gripperStator', 8, 7, [], 7, [], 'z1_GripperStator.glb');
        let link9 = new RobotLink('gripperMover', 9, 8, [], 8, [], 'z1_GripperMover.glb');

        return [link0, link1, link2, link3, link4, link5, link6, link7, link8, link9];
    }

    get_robot_kinematic_hierarchy() {
        return [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9]];
    }
}

export class B1Robot extends RobotBaseClass {
    constructor() {
        super();
    }

    get_robot_links_mesh_directory_name() {
        return 'unitree_robot_meshes';
    }

    get_robot_name() {
        return 'B1';
    }

    get_robot_joints() {
        let joint0 = new RobotJointFloating('floating_base', 0, 0, 1, [0,1,2], [3,4,5]);
        let joint1 = new RobotJointFixed('imu_joint', 1, 1, 2);

        let joint2 = new RobotJointRevolute('FR_hip_joint', 2, 1, 3, 6, [1,0,0], -0.75, 0.75, [0.3455, -0.072, 0.0], [0,0,0]);
        let joint3 = new RobotJointFixed('FR_hip_rotor_joint', 3, 1, 4, [0.1955, -0.072, 0.0], [0,0,0]);
        let joint4 = new RobotJointRevolute('FR_thigh_joint', 4, 3, 5, 7, [0,1,0], -1.0, 3.5,  [0.0, -0.12675, 0.0], [0,0,0]);
        let joint5 = new RobotJointFixed('FR_thigh_rotor_joint', 5, 3, 6, [0.0, -0.00935, 0.0], [0,0,0]);
        let joint6 = new RobotJointRevolute('FR_calf_joint', 6, 5, 7, 8, [0,1,0], -2.6, -0.6,  [0.0, 0.0, -0.35], [0,0,0]);
        let joint7 = new RobotJointFixed('FR_calf_rotor_joint', 7, 5, 8, [0.0, 0.0519, 0.0] , [0,0,0]);
        let joint8 = new RobotJointFixed('FR_foot_fixed', 8, 7, 9, [0.0, 0.0, -0.35] , [0,0,0]);

        let joint9 = new RobotJointRevolute('FL_hip_joint', 9, 1, 10, 9, [1,0,0], -0.75, 0.75, [0.3455, 0.072, 0.0], [0,0,0]);
        let joint10 = new RobotJointFixed('FL_hip_rotor_joint', 10, 1, 11, [0.1955, 0.072, 0.0], [0,0,0]);
        let joint11 = new RobotJointRevolute('FL_thigh_joint', 11, 10, 12, 10, [0,1,0], -1.0, 3.5,  [0.0, 0.12675, 0.0], [0,0,0]);
        let joint12 = new RobotJointFixed('FL_thigh_rotor_joint', 12, 10, 13, [0.0, 0.00935, 0.0], [0,0,0]);
        let joint13 = new RobotJointRevolute('FL_calf_joint', 13, 12, 14, 11, [0,1,0], -2.6, -0.6,  [0.0, 0.0, -0.35], [0,0,0]);
        let joint14 = new RobotJointFixed('FL_calf_rotor_joint', 14, 12, 15, [0.0, -0.0519, 0.0] , [0,0,0]);
        let joint15 = new RobotJointFixed('FL_foot_fixed', 15, 14, 16, [0.0, 0.0, -0.35] , [0,0,0]);

        let joint16 = new RobotJointRevolute('RR_hip_joint', 16, 1, 17, 12, [1,0,0], -0.75, 0.75, [-0.3455, -0.072, 0.0], [0,0,0]);
        let joint17 = new RobotJointFixed('RR_hip_rotor_joint', 17, 1, 18, [0.1955, -0.072, 0.0], [0,0,0]);
        let joint18 = new RobotJointRevolute('RR_thigh_joint', 18, 17, 19, 13, [0,1,0], -1.0, 3.5,  [0.0, -0.12675, 0.0], [0,0,0]);
        let joint19 = new RobotJointFixed('RR_thigh_rotor_joint', 19, 17, 20, [0.0, -0.00935, 0.0], [0,0,0]);
        let joint20 = new RobotJointRevolute('RR_calf_joint', 20, 19, 21, 14, [0,1,0], -2.6, -0.6,  [0.0, 0.0, -0.35], [0,0,0]);
        let joint21 = new RobotJointFixed('RR_calf_rotor_joint', 21, 19, 22, [0.0, 0.0519, 0.0] , [0,0,0]);
        let joint22 = new RobotJointFixed('RR_foot_fixed', 22, 21, 23, [0.0, 0.0, -0.35] , [0,0,0]);

        let joint23 = new RobotJointRevolute('RL_hip_joint', 23, 1, 24, 15, [1,0,0], -0.75, 0.75, [-0.3455, 0.072, 0.0], [0,0,0]);
        let joint24 = new RobotJointFixed('RL_hip_rotor_joint', 24, 1, 25, [0.1955, 0.072, 0.0], [0,0,0]);
        let joint25 = new RobotJointRevolute('RL_thigh_joint', 25, 24, 26, 16, [0,1,0], -1.0, 3.5,  [0.0, 0.12675, 0.0], [0,0,0]);
        let joint26 = new RobotJointFixed('RL_thigh_rotor_joint', 26, 24, 27, [0.0, 0.00935, 0.0], [0,0,0]);
        let joint27 = new RobotJointRevolute('RL_calf_joint', 27, 26, 28, 17, [0,1,0], -2.6, -0.6,  [0.0, 0.0, -0.35], [0,0,0]);
        let joint28 = new RobotJointFixed('RL_calf_rotor_joint', 28, 26, 29, [0.0, -0.0519, 0.0] , [0,0,0]);
        let joint29 = new RobotJointFixed('RL_foot_fixed', 29, 28, 30, [0.0, 0.0, -0.35] , [0,0,0]);

        return [
            joint0, joint1,
            joint2, joint3, joint4, joint5, joint6, joint7, joint8,
            joint9, joint10, joint11, joint12, joint13, joint14, joint15,
            joint16, joint17, joint18, joint19, joint20, joint21, joint22,
            joint23, joint24, joint25, joint26, joint27, joint28, joint29
        ];
    }

    get_robot_links() {
        let link0 = new RobotLink('base', 0, null, [0], null, [1]);
        let link1 = new RobotLink('trunk', 1, 0, [1, 2, 3, 9, 10, 16, 17, 23, 24], 0, [2, 3, 4, 10, 11, 17, 18, 24, 25], 'trunk.glb');
        let link2 = new RobotLink('imu_link', 2, 1, [], 1, []);

        let link3 = new RobotLink('FR_hip', 3, 2, [4,5], 1, [5,6], 'hip.glb');
        let link4 = new RobotLink('FR_hip_rotor', 4, 3, [], 1, []);
        let link5 = new RobotLink('FR_thigh', 5, 4, [6,7], 3, [7,8], 'thigh_mirror.glb');
        let link6 = new RobotLink('FR_thigh_rotor', 6, 5, [], 3, []);
        let link7 = new RobotLink('FR_calf', 7, 6, [8], 5, [9], 'calf.glb');
        let link8 = new RobotLink('FR_calf_rotor', 8, 7, [], 5, []);
        let link9 = new RobotLink('FR_foot', 9, 8, [], 7, []);

        let link10 = new RobotLink('FL_hip', 10, 9, [11,12], 1, [12,13], 'hip.glb');
        let link11 = new RobotLink('FL_hip_rotor', 11, 10, [], 1, []);
        let link12 = new RobotLink('FL_thigh', 12, 11, [13,14], 10, [14,15], 'thigh.glb');
        let link13 = new RobotLink('FL_thigh_rotor', 13, 12, [], 10, []);
        let link14 = new RobotLink('FL_calf', 14, 13, [15], 12, [16], 'calf.glb');
        let link15 = new RobotLink('FL_calf_rotor', 15, 14, [], 12, []);
        let link16 = new RobotLink('FL_foot', 16, 15, [], 14, []);

        let link17 = new RobotLink('RR_hip', 17, 16, [18,19], 1, [19,20], 'hip.glb');
        let link18 = new RobotLink('RR_hip_rotor', 18, 17, [], 1, []);
        let link19 = new RobotLink('RR_thigh', 19, 18, [20,21], 17, [21,22], 'thigh_mirror.glb');
        let link20 = new RobotLink('RR_thigh_rotor', 20, 19, [], 17, []);
        let link21 = new RobotLink('RR_calf', 21, 20, [22], 19, [23], 'calf.glb');
        let link22 = new RobotLink('RR_calf_rotor', 22, 21, [], 19, []);
        let link23 = new RobotLink('RR_foot', 23, 22, [], 21, []);

        let link24 = new RobotLink('RL_hip', 24, 23, [25,26], 1, [26,27], 'hip.glb');
        let link25 = new RobotLink('RL_hip_rotor', 25, 24, [], 1, []);
        let link26 = new RobotLink('RL_thigh', 26, 25, [27,28], 24, [28,29], 'thigh.glb');
        let link27 = new RobotLink('RL_thigh_rotor', 27, 26, [], 24, []);
        let link28 = new RobotLink('RL_calf', 28, 27, [29], 26, [30], 'calf.glb');
        let link29 = new RobotLink('RL_calf_rotor', 29, 28, [], 26, []);
        let link30 = new RobotLink('RL_foot', 30, 29, [], 28, []);

        return [
            link0, link1, link2,
            link3, link4, link5, link6, link7, link8, link9,
            link10, link11, link12, link13, link14, link15, link16,
            link17, link18, link19, link20, link21, link22, link23,
            link24, link25, link26, link27, link28, link29, link30
        ];
    }

    get_robot_kinematic_hierarchy() {
        return [[0], [1], [2, 3, 4, 10, 11, 17, 18, 24, 25], [5, 6, 12, 13, 19, 20, 26, 27], [7, 8, 14, 15, 21, 22, 28, 29], [9, 16, 23, 30]];
    }
}

export class B1Z1Robot extends RobotBaseClass {
    constructor() {
        super();
    }

    get_robot_links_mesh_directory_name() {
        return 'unitree_robot_meshes';
    }

    get_robot_name() {
        return 'B1Z1';
    }

    get_robot_joints() {
        let joint0 = new RobotJointFloating('floating_base', 0, 0, 1, [0,1,2], [3,4,5]);
        let joint1 = new RobotJointFixed('imu_joint', 1, 1, 2);

        let joint2 = new RobotJointRevolute('FR_hip_joint', 2, 1, 3, 6, [1,0,0], -0.75, 0.75, [0.3455, -0.072, 0.0], [0,0,0]);
        let joint3 = new RobotJointFixed('FR_hip_rotor_joint', 3, 1, 4, [0.1955, -0.072, 0.0], [0,0,0]);
        let joint4 = new RobotJointRevolute('FR_thigh_joint', 4, 3, 5, 7, [0,1,0], -1.0, 3.5,  [0.0, -0.12675, 0.0], [0,0,0]);
        let joint5 = new RobotJointFixed('FR_thigh_rotor_joint', 5, 3, 6, [0.0, -0.00935, 0.0], [0,0,0]);
        let joint6 = new RobotJointRevolute('FR_calf_joint', 6, 5, 7, 8, [0,1,0], -2.6, -0.6,  [0.0, 0.0, -0.35], [0,0,0]);
        let joint7 = new RobotJointFixed('FR_calf_rotor_joint', 7, 5, 8, [0.0, 0.0519, 0.0] , [0,0,0]);
        let joint8 = new RobotJointFixed('FR_foot_fixed', 8, 7, 9, [0.0, 0.0, -0.35] , [0,0,0]);

        let joint9 = new RobotJointRevolute('FL_hip_joint', 9, 1, 10, 9, [1,0,0], -0.75, 0.75, [0.3455, 0.072, 0.0], [0,0,0]);
        let joint10 = new RobotJointFixed('FL_hip_rotor_joint', 10, 1, 11, [0.1955, 0.072, 0.0], [0,0,0]);
        let joint11 = new RobotJointRevolute('FL_thigh_joint', 11, 10, 12, 10, [0,1,0], -1.0, 3.5,  [0.0, 0.12675, 0.0], [0,0,0]);
        let joint12 = new RobotJointFixed('FL_thigh_rotor_joint', 12, 10, 13, [0.0, 0.00935, 0.0], [0,0,0]);
        let joint13 = new RobotJointRevolute('FL_calf_joint', 13, 12, 14, 11, [0,1,0], -2.6, -0.6,  [0.0, 0.0, -0.35], [0,0,0]);
        let joint14 = new RobotJointFixed('FL_calf_rotor_joint', 14, 12, 15, [0.0, -0.0519, 0.0] , [0,0,0]);
        let joint15 = new RobotJointFixed('FL_foot_fixed', 15, 14, 16, [0.0, 0.0, -0.35] , [0,0,0]);

        let joint16 = new RobotJointRevolute('RR_hip_joint', 16, 1, 17, 12, [1,0,0], -0.75, 0.75, [-0.3455, -0.072, 0.0], [0,0,0]);
        let joint17 = new RobotJointFixed('RR_hip_rotor_joint', 17, 1, 18, [0.1955, -0.072, 0.0], [0,0,0]);
        let joint18 = new RobotJointRevolute('RR_thigh_joint', 18, 17, 19, 13, [0,1,0], -1.0, 3.5,  [0.0, -0.12675, 0.0], [0,0,0]);
        let joint19 = new RobotJointFixed('RR_thigh_rotor_joint', 19, 17, 20, [0.0, -0.00935, 0.0], [0,0,0]);
        let joint20 = new RobotJointRevolute('RR_calf_joint', 20, 19, 21, 14, [0,1,0], -2.6, -0.6,  [0.0, 0.0, -0.35], [0,0,0]);
        let joint21 = new RobotJointFixed('RR_calf_rotor_joint', 21, 19, 22, [0.0, 0.0519, 0.0] , [0,0,0]);
        let joint22 = new RobotJointFixed('RR_foot_fixed', 22, 21, 23, [0.0, 0.0, -0.35] , [0,0,0]);

        let joint23 = new RobotJointRevolute('RL_hip_joint', 23, 1, 24, 15, [1,0,0], -0.75, 0.75, [-0.3455, 0.072, 0.0], [0,0,0]);
        let joint24 = new RobotJointFixed('RL_hip_rotor_joint', 24, 1, 25, [0.1955, 0.072, 0.0], [0,0,0]);
        let joint25 = new RobotJointRevolute('RL_thigh_joint', 25, 24, 26, 16, [0,1,0], -1.0, 3.5,  [0.0, 0.12675, 0.0], [0,0,0]);
        let joint26 = new RobotJointFixed('RL_thigh_rotor_joint', 26, 24, 27, [0.0, 0.00935, 0.0], [0,0,0]);
        let joint27 = new RobotJointRevolute('RL_calf_joint', 27, 26, 28, 17, [0,1,0], -2.6, -0.6,  [0.0, 0.0, -0.35], [0,0,0]);
        let joint28 = new RobotJointFixed('RL_calf_rotor_joint', 28, 26, 29, [0.0, -0.0519, 0.0] , [0,0,0]);
        let joint29 = new RobotJointFixed('RL_foot_fixed', 29, 28, 30, [0.0, 0.0, -0.35] , [0,0,0]);


        let joint30 = new RobotJointFixed('base_static_joint', 30, 31, 32, [0,0,0], [0,0,0]);
        let joint31 = new RobotJointRevolute('joint1', 31, 32, 33, 18, [0,0,1], -2.6179938779914944, 2.6179938779914944,  [0.0, 0.0, 0.0585], [0,0,0]);
        let joint32 = new RobotJointRevolute('joint2', 32, 33, 34, 19, [0,1,0], 0, 2.9670597283903604, [0.0, 0.0, 0.045], [0,0,0]);
        let joint33 = new RobotJointRevolute('joint3', 33, 34, 35, 20, [0,1,0], -2.8797932657906435, 0, [-0.35, 0.0, 0.0], [0,0,0]);
        let joint34 = new RobotJointRevolute('joint4', 34, 35, 36, 21, [0,1,0], -1.5184364492350666, 1.5184364492350666, [0.218, 0.0, 0.057], [0,0,0]);
        let joint35 = new RobotJointRevolute('joint5', 35, 36, 37, 22, [0,0,1], -1.3439035240356338, 1.3439035240356338, [0.07, 0.0, 0.0], [0,0,0]);
        let joint36 = new RobotJointRevolute('joint6', 36, 37, 38, 23, [1,0,0], -2.792526803190927, 2.792526803190927, [0.0492, 0.0, 0.0], [0,0,0]);
        let joint37 = new RobotJointFixed('gripperStator', 37, 38, 39, [0.051,0,0], [0,0,0]);
        let joint38 = new RobotJointFixed('jointGripper', 38, 39, 40, [0.049,0,0], [0,-0.5,0]);

        let joint39 = new RobotJointFixed('offset', 39, 1, 31, [0.162,0,0.073], [0,0,0]);

        return [
            joint0, joint1,
            joint2, joint3, joint4, joint5, joint6, joint7, joint8,
            joint9, joint10, joint11, joint12, joint13, joint14, joint15,
            joint16, joint17, joint18, joint19, joint20, joint21, joint22,
            joint23, joint24, joint25, joint26, joint27, joint28, joint29,
            joint30, joint31, joint32, joint33, joint34, joint35, joint36, joint37, joint38,
            joint39
        ];
    }

    get_robot_links() {
        let link0 = new RobotLink('base', 0, null, [0], null, [1]);
        let link1 = new RobotLink('trunk', 1, 0, [1, 2, 3, 9, 10, 16, 17, 23, 24], 0, [2, 3, 4, 10, 11, 17, 18, 24, 25], 'trunk.glb');
        let link2 = new RobotLink('imu_link', 2, 1, [], 1, []);

        let link3 = new RobotLink('FR_hip', 3, 2, [4,5], 1, [5,6], 'hip.glb');
        let link4 = new RobotLink('FR_hip_rotor', 4, 3, [], 1, []);
        let link5 = new RobotLink('FR_thigh', 5, 4, [6,7], 3, [7,8], 'thigh_mirror.glb');
        let link6 = new RobotLink('FR_thigh_rotor', 6, 5, [], 3, []);
        let link7 = new RobotLink('FR_calf', 7, 6, [8], 5, [9], 'calf.glb');
        let link8 = new RobotLink('FR_calf_rotor', 8, 7, [], 5, []);
        let link9 = new RobotLink('FR_foot', 9, 8, [], 7, []);

        let link10 = new RobotLink('FL_hip', 10, 9, [11,12], 1, [12,13], 'hip.glb');
        let link11 = new RobotLink('FL_hip_rotor', 11, 10, [], 1, []);
        let link12 = new RobotLink('FL_thigh', 12, 11, [13,14], 10, [14,15], 'thigh.glb');
        let link13 = new RobotLink('FL_thigh_rotor', 13, 12, [], 10, []);
        let link14 = new RobotLink('FL_calf', 14, 13, [15], 12, [16], 'calf.glb');
        let link15 = new RobotLink('FL_calf_rotor', 15, 14, [], 12, []);
        let link16 = new RobotLink('FL_foot', 16, 15, [], 14, []);

        let link17 = new RobotLink('RR_hip', 17, 16, [18,19], 1, [19,20], 'hip.glb');
        let link18 = new RobotLink('RR_hip_rotor', 18, 17, [], 1, []);
        let link19 = new RobotLink('RR_thigh', 19, 18, [20,21], 17, [21,22], 'thigh_mirror.glb');
        let link20 = new RobotLink('RR_thigh_rotor', 20, 19, [], 17, []);
        let link21 = new RobotLink('RR_calf', 21, 20, [22], 19, [23], 'calf.glb');
        let link22 = new RobotLink('RR_calf_rotor', 22, 21, [], 19, []);
        let link23 = new RobotLink('RR_foot', 23, 22, [], 21, []);

        let link24 = new RobotLink('RL_hip', 24, 23, [25,26], 1, [26,27], 'hip.glb');
        let link25 = new RobotLink('RL_hip_rotor', 25, 24, [], 1, []);
        let link26 = new RobotLink('RL_thigh', 26, 25, [27,28], 24, [28,29], 'thigh.glb');
        let link27 = new RobotLink('RL_thigh_rotor', 27, 26, [], 24, []);
        let link28 = new RobotLink('RL_calf', 28, 27, [29], 26, [30], 'calf.glb');
        let link29 = new RobotLink('RL_calf_rotor', 29, 28, [], 26, []);
        let link30 = new RobotLink('RL_foot', 30, 29, [], 28, []);


        let link31 = new RobotLink('world', 31, 39, [31], 1, [32]);
        let link32 = new RobotLink('link00', 32, 30, [31], 31, [33], 'z1_Link00.glb');
        let link33 = new RobotLink('link01', 33, 31, [32], 32, [34], 'z1_Link01.glb');
        let link34 = new RobotLink('link02', 34, 32, [33], 33, [35], 'z1_Link02.glb');
        let link35 = new RobotLink('link03', 35, 33, [34], 34, [36], 'z1_Link03.glb');
        let link36 = new RobotLink('link04', 36, 34, [35], 35, [37], 'z1_Link04.glb');
        let link37 = new RobotLink('link05', 37, 35, [36], 36, [38], 'z1_Link05.glb');
        let link38 = new RobotLink('link06', 38, 36, [37], 37, [39], 'z1_Link06.glb');
        let link39 = new RobotLink('gripperStator', 39, 37, [], 38, [], 'z1_GripperStator.glb');
        let link40 = new RobotLink('gripperMover', 40, 38, [], 39, [], 'z1_GripperMover.glb');


        return [
            link0, link1, link2,
            link3, link4, link5, link6, link7, link8, link9,
            link10, link11, link12, link13, link14, link15, link16,
            link17, link18, link19, link20, link21, link22, link23,
            link24, link25, link26, link27, link28, link29, link30,
            link31, link32, link33, link34, link35, link36, link37, link38, link39, link40
        ];
    }

    get_robot_kinematic_hierarchy() {
        // return [[0], [1], [2, 3, 4, 10, 11, 17, 18, 24, 25], [5, 6, 12, 13, 19, 20, 26, 27], [7, 8, 14, 15, 21, 22, 28, 29], [9, 16, 23, 30], [31], [32], [33], [34], [35], [36], [37], [38], [39], [40]];
        return [[0], [1], [2, 3, 4, 10, 11, 17, 18, 24, 25, 31], [5, 6, 12, 13, 19, 20, 26, 27, 32], [7, 8, 14, 15, 21, 22, 28, 29, 33], [9, 16, 23, 30, 34], [35], [36], [37], [38], [39], [40]];
    }
}