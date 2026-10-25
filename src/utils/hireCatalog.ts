export interface HireCategory {
  id: string;
  name: string;
  description: string;
  iconName: 'Truck' | 'Wrench';
  types: string[];
}

export const VEHICLE_TYPES = [
  'Excavators',
  'JCB',
  'Road Rollers / Compactors',
  'Tractor',
  'Bulldozers',
  'Backhoe Loaders',
  'Skid Steer Loaders',
  'Motor Graders',
  'Wheel Loaders',
  'Dump Trucks',
  'Articulated Haulers',
  'Scrapers',
  'Cranes (Tower & Mobile)',
  'Forklifts',
  'Telehandlers',
  'Boom Lifts & Scissor Lifts',
  'Concrete Mixer (Ajax)',
  'Concrete Pump Trucks'
] as const;

/** Merge saved or legacy types into the predefined catalog without case-only duplicates. */
export const mergeVehicleTypeOptions = (...groups: readonly (readonly unknown[])[]): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const value of group) {
      if (typeof value !== 'string') continue;
      const name = value.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(name);
    }
  }

  return result;
};

export const vehicleCategoryForType = (type: string): string => {
  if (['Excavators', 'JCB', 'Bulldozers', 'Backhoe Loaders', 'Skid Steer Loaders', 'Motor Graders', 'Wheel Loaders'].includes(type)) return 'Earthmoving & Digging';
  if (['Dump Trucks', 'Articulated Haulers', 'Scrapers', 'Tractor'].includes(type)) return 'Hauling & Transport';
  if (['Cranes (Tower & Mobile)', 'Forklifts', 'Telehandlers', 'Boom Lifts & Scissor Lifts'].includes(type)) return 'Lifting & Material Handling';
  return 'Paving & Concrete';
};

export const VEHICLE_HIRE_CATEGORIES: HireCategory[] = [
  { id: 'earthmoving_digging', name: 'Earthmoving & Digging', description: 'Excavation, grading and earthmoving equipment.', iconName: 'Truck', types: ['Excavators', 'JCB', 'Bulldozers', 'Backhoe Loaders', 'Skid Steer Loaders', 'Motor Graders', 'Wheel Loaders'] },
  { id: 'hauling_transport', name: 'Hauling & Transport', description: 'Vehicles for hauling and moving site materials.', iconName: 'Truck', types: ['Dump Trucks', 'Articulated Haulers', 'Scrapers', 'Tractor'] },
  { id: 'lifting_handling', name: 'Lifting & Material Handling', description: 'Cranes and equipment for lifting materials.', iconName: 'Truck', types: ['Cranes (Tower & Mobile)', 'Forklifts', 'Telehandlers', 'Boom Lifts & Scissor Lifts'] },
  { id: 'paving_concrete', name: 'Paving & Concrete', description: 'Concrete, paving and compaction equipment.', iconName: 'Truck', types: ['Road Rollers / Compactors', 'Concrete Mixer (Ajax)', 'Concrete Pump Trucks'] }
];

export const MACHINERY_HIRE_CATEGORIES: HireCategory[] = [
  { id: 'drilling_tools', name: 'Drilling Tools', description: 'Drills and rotary equipment for site work.', iconName: 'Wrench', types: ['Cordless / Electric Drill', 'Hammer Drill', 'Rotary Hammer', 'Impact Driver', 'Core Drill (Diamond Core Drill)'] },
  { id: 'cutting_tools', name: 'Cutting Tools', description: 'Powered and manual cutting equipment.', iconName: 'Wrench', types: ['Circular Saw', 'Angle Grinder', 'Reciprocating Saw', 'Jigsaw', 'Concrete Saw (Walk-Behind or Handheld)', 'Hand Saw / Backsaw / Hacksaw', 'Tile Cutter', 'Utility Knife'] }
];
