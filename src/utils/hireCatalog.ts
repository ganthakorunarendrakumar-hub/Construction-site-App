export interface HireCategory {
  id: string;
  name: string;
  description: string;
  iconName: 'Truck' | 'Wrench';
  types: string[];
}

export const VEHICLE_HIRE_CATEGORIES: HireCategory[] = [
  { id: 'earthmoving_digging', name: 'Earthmoving & Digging', description: 'Excavation, grading and earthmoving equipment.', iconName: 'Truck', types: ['Excavators', 'Bulldozers', 'Backhoe Loaders', 'Skid Steer Loaders', 'Motor Graders', 'Wheel Loaders', 'Dump Trucks'] },
  { id: 'hauling_transport', name: 'Hauling & Transport', description: 'Vehicles for hauling and moving site materials.', iconName: 'Truck', types: ['Articulated Haulers', 'Scrapers'] },
  { id: 'lifting_handling', name: 'Lifting & Material Handling', description: 'Cranes and equipment for lifting materials.', iconName: 'Truck', types: ['Cranes (Tower & Mobile)', 'Forklifts', 'Telehandlers', 'Boom Lifts & Scissor Lifts'] },
  { id: 'paving_concrete', name: 'Paving & Concrete', description: 'Concrete, paving and compaction equipment.', iconName: 'Truck', types: ['Concrete Mixer (Ajax)', 'Concrete Pump Trucks', 'Road Rollers / Compactors', 'Tractor', 'Tanker'] }
];

export const MACHINERY_HIRE_CATEGORIES: HireCategory[] = [
  { id: 'drilling_tools', name: 'Drilling Tools', description: 'Drills and rotary equipment for site work.', iconName: 'Wrench', types: ['Cordless / Electric Drill', 'Hammer Drill', 'Rotary Hammer', 'Impact Driver', 'Core Drill (Diamond Core Drill)'] },
  { id: 'cutting_tools', name: 'Cutting Tools', description: 'Powered and manual cutting equipment.', iconName: 'Wrench', types: ['Circular Saw', 'Angle Grinder', 'Reciprocating Saw', 'Jigsaw', 'Concrete Saw (Walk-Behind or Handheld)', 'Hand Saw / Backsaw / Hacksaw', 'Tile Cutter', 'Utility Knife'] }
];
