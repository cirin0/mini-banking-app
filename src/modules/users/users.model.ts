export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;

  //relations
  // accounts?: Account[];
  // transactions?: Transaction[];
}
