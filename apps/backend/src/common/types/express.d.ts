import { UserInfo } from '../utils/graphql-context';

declare global {
  namespace Express {
    interface User extends UserInfo {}
  }
}
