export type WorkoutLog = {
  id: string;
  workoutType: string;
  exercise: string;
  setsRepsTimeDistance: string;
  location: string;
  notes: string;
  createdAt: string;
};

export type MissionSubmission = {
  id: string;
  missionTitle: string;
  result: string;
  videoProofName: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};
