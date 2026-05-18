import type { LucideIcon } from "lucide-react";
import {
  Cross,
  Pill,
  Stethoscope,
  Coffee,
  Activity,
  Baby,
  DoorOpen,
  HeartPulse,
} from "lucide-react";

export type Direction = "straight" | "left" | "right" | "arrived";

export type RouteStep = {
  direction: Direction;
  instruction: string;
  /** distance in meters covered during this step */
  distance: number;
};

export type Destination = {
  id: string;
  name: string;
  category: string;
  level: string;
  icon: LucideIcon;
  /** total distance in meters */
  distance: number;
  /** estimated walking time */
  eta: string;
  steps: RouteStep[];
};

export const FACILITY_NAME = "Saiz Syete Medical Centre";
export const CURRENT_LOCATION = "Level 1 · Main Lobby (Entrance A)";

export const DESTINATIONS: Destination[] = [
  {
    id: "emergency",
    name: "Emergency Department",
    category: "Critical Care",
    level: "Level 1",
    icon: HeartPulse,
    distance: 48,
    eta: "1 min",
    steps: [
      { direction: "straight", instruction: "Walk straight past reception", distance: 20 },
      { direction: "right", instruction: "Turn right at the red signage", distance: 18 },
      { direction: "straight", instruction: "Continue to ER entrance", distance: 10 },
      { direction: "arrived", instruction: "You've arrived at Emergency", distance: 0 },
    ],
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    category: "Services",
    level: "Level 1",
    icon: Pill,
    distance: 32,
    eta: "1 min",
    steps: [
      { direction: "straight", instruction: "Head straight toward the lobby", distance: 12 },
      { direction: "left", instruction: "Turn left at the help desk", distance: 14 },
      { direction: "straight", instruction: "Pharmacy is on your right", distance: 6 },
      { direction: "arrived", instruction: "You've arrived at the Pharmacy", distance: 0 },
    ],
  },
  {
    id: "radiology",
    name: "Radiology / X-Ray",
    category: "Diagnostics",
    level: "Level 2",
    icon: Activity,
    distance: 86,
    eta: "2 min",
    steps: [
      { direction: "straight", instruction: "Walk to the central lift lobby", distance: 24 },
      { direction: "right", instruction: "Take Lift B to Level 2", distance: 6 },
      { direction: "straight", instruction: "Exit lift, walk down the corridor", distance: 38 },
      { direction: "left", instruction: "Turn left at the blue line", distance: 18 },
      { direction: "arrived", instruction: "You've arrived at Radiology", distance: 0 },
    ],
  },
  {
    id: "pediatrics",
    name: "Pediatrics Ward",
    category: "Wards",
    level: "Level 3",
    icon: Baby,
    distance: 110,
    eta: "3 min",
    steps: [
      { direction: "straight", instruction: "Proceed to lift lobby", distance: 24 },
      { direction: "right", instruction: "Take Lift A to Level 3", distance: 8 },
      { direction: "left", instruction: "Turn left toward the yellow corridor", distance: 42 },
      { direction: "straight", instruction: "Follow the painted footprints", distance: 36 },
      { direction: "arrived", instruction: "Welcome to Pediatrics", distance: 0 },
    ],
  },
  {
    id: "outpatient",
    name: "Outpatient Clinic",
    category: "Consultation",
    level: "Level 1",
    icon: Stethoscope,
    distance: 54,
    eta: "1 min",
    steps: [
      { direction: "left", instruction: "Turn left after reception", distance: 16 },
      { direction: "straight", instruction: "Continue past the waiting area", distance: 28 },
      { direction: "right", instruction: "Clinic entrance on your right", distance: 10 },
      { direction: "arrived", instruction: "You've arrived at Outpatient", distance: 0 },
    ],
  },
  {
    id: "cafeteria",
    name: "Cafeteria",
    category: "Amenities",
    level: "Level 2",
    icon: Coffee,
    distance: 72,
    eta: "2 min",
    steps: [
      { direction: "straight", instruction: "Head to the central lifts", distance: 24 },
      { direction: "right", instruction: "Take Lift B to Level 2", distance: 6 },
      { direction: "right", instruction: "Turn right exiting the lift", distance: 28 },
      { direction: "straight", instruction: "Cafeteria is straight ahead", distance: 14 },
      { direction: "arrived", instruction: "Enjoy your meal!", distance: 0 },
    ],
  },
  {
    id: "chapel",
    name: "Prayer Room",
    category: "Amenities",
    level: "Level 1",
    icon: Cross,
    distance: 40,
    eta: "1 min",
    steps: [
      { direction: "right", instruction: "Turn right at the entrance hall", distance: 18 },
      { direction: "straight", instruction: "Walk past the gift shop", distance: 16 },
      { direction: "left", instruction: "Prayer room on your left", distance: 6 },
      { direction: "arrived", instruction: "You've arrived at the Prayer Room", distance: 0 },
    ],
  },
  {
    id: "exit",
    name: "Main Exit",
    category: "Exits",
    level: "Level 1",
    icon: DoorOpen,
    distance: 28,
    eta: "1 min",
    steps: [
      { direction: "straight", instruction: "Walk straight to the main doors", distance: 28 },
      { direction: "arrived", instruction: "You've reached the Main Exit", distance: 0 },
    ],
  },
];

export function getDestination(id: string) {
  return DESTINATIONS.find((d) => d.id === id);
}
