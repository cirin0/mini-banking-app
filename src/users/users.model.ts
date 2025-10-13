export interface User {
  id: number;
  email: string;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;

  //relations
  // accounts?: Account[];
  // transactions?: Transaction[];
}
