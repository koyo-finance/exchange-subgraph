import { InternalBalanceChanged } from "../../../generated/Vault/Vault";
import { getTokenDecimals, tokenToDecimal } from "../../helpers/token";
import {
  getOrRegisterAccount,
  getOrRegisterAccountInternalBalance
} from "../../services/accounts";

export function handleInternalBalanceChange(
  event: InternalBalanceChanged
): void {
  let token = event.params.token;
  let account = getOrRegisterAccount(event.params.user);
  let accountBalance = getOrRegisterAccountInternalBalance(account.id, token);

  let transferAmount = tokenToDecimal(
    event.params.delta,
    getTokenDecimals(token)
  );
  accountBalance.balance = accountBalance.balance.plus(transferAmount);
  accountBalance.balanceRaw = accountBalance.balanceRaw.plus(
    event.params.delta
  );

  accountBalance.save();
}
