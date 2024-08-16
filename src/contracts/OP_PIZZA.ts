import { u128, u256 } from 'as-bignum/assembly';
import {
    Address,
    AddressMemoryMap,
    Blockchain,
    BytesWriter,
    Calldata,
    encodeSelector,
    Map,
    MemorySlotData,
    OP_20,
    Revert,
    SafeMath,
    Selector,
} from '@btc-vision/btc-runtime/runtime';

@final
export class OP_PIZZA extends OP_20 {
    private limitPerMint: u256 = u128.fromString('10000000000000000000').toU256(); // 10
    private mintLimit: u256 = u128.fromString('1').toU256();
    private mintCountByAddress: AddressMemoryMap<Address, MemorySlotData<u256>>;
    constructor() {
        const maxSupply: u256 = u128.fromString('2000000000000000000000000').toU256(); // 2,000,000
        const decimals: u8 = 18;
        const name: string = 'OP_PIZZA';
        const symbol: string = 'OP_PIZZA';

        super(maxSupply, decimals, name, symbol);

        this.mintCountByAddress = new AddressMemoryMap<Address, MemorySlotData<u256>>(
            Blockchain.nextPointer,
            u256.Zero,
        );
    }

    public override callMethod(method: Selector, calldata: Calldata): BytesWriter {
        switch (method) {
            case encodeSelector('isAddressOwner'):
                return this.isAddressOwnerOverride(calldata);
            default:
                return super.callMethod(method, calldata);
        }
    }

    // Override the isAddressOwner method in OP_NET class.
    // Always returns true so everyone is the owner, so they can mint through OP_WALLET.
    private isAddressOwnerOverride(calldata: Calldata): BytesWriter {
        const response = new BytesWriter();
        response.writeBoolean(true);
        return response;
    }

    // Override the _mint method in OP_20 class to allow minting without being owner.
    // Also introduces a limit to the amount that can be minted at once, as well as mint count limit.
    protected override _mint(to: Address, value: u256, onlyOwner: boolean = true): boolean {
        if (value > this.limitPerMint) {
            throw new Revert(`Mint amount exceeds limit of ${this.limitPerMint}`);
        }

        if (!this.mintCountByAddress.has(to)) {
            this.mintCountByAddress.set(to, u256.from(1));
        } else {
            const mintCount: u256 = this.mintCountByAddress.get(to);
            if (mintCount == this.mintLimit) {
                throw new Revert(`Mint limit reached for ${to}`);
            }
            const newMintCount: u256 = SafeMath.add(mintCount, u256.from(1));

            this.mintCountByAddress.set(to, newMintCount);
        }

        return super._mint(to, value, false);
    }
}
