import { Permissions, Actions } from '../casl';
import { Roles } from '../../common/constants/roles.constants';

export const permissions: Permissions<Roles> = {
  everyone({ can }) {
    // All authenticated users can manage their own payments
    can(Actions.read, 'Transaction', { userId: '${user.id}' });
    can(Actions.create, 'Transaction');
    can(Actions.read, 'PaymentMethod', { userId: '${user.id}' });
    can(Actions.create, 'PaymentMethod');
    can(Actions.update, 'PaymentMethod', { userId: '${user.id}' });
    can(Actions.delete, 'PaymentMethod', { userId: '${user.id}' });
    can(Actions.read, 'PaymentOption');
  },

  [Roles.APPLICANT]({ can }) {
    // Regular users can initiate payments and view their transactions
    can(Actions.create, 'Payment');
    can(Actions.read, 'Payment', { userId: '${user.id}' });
    can(Actions.create, 'Refund', { userId: '${user.id}' });
    can(Actions.read, 'Wallet', { userId: '${user.id}' });
  },

  [Roles.ADMIN]({ can }) {
    // Admins can manage all payment operations
    can(Actions.manage, 'Transaction');
    can(Actions.manage, 'Payment');
    can(Actions.manage, 'Refund');
    can(Actions.manage, 'PaymentMethod');
    can(Actions.manage, 'Wallet');
    can(Actions.create, 'Transfer');
    can(Actions.read, 'Transfer');
    can(Actions.manage, 'PaymentOption');
  },

  [Roles.SUPER_ADMIN]({ can }) {
    // Super admins have full access to everything
    can(Actions.manage, 'all');
  },
};
