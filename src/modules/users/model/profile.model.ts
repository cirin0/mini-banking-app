import { Account } from 'src/modules/accounts/accounts.model';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;

  accounts?: Account[];
}
