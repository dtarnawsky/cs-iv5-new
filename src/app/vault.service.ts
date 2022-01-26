import { Injectable, NgZone } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import {
  Vault,
  Device,
  DeviceSecurityType,
  VaultType,
  BrowserVault,
  IdentityVaultConfig,
} from "@ionic-enterprise/identity-vault";

const config: IdentityVaultConfig = {
  key: "io.ionic.getstartedivangular4",
  type: VaultType.DeviceSecurity,
  deviceSecurityType: DeviceSecurityType.SystemPasscode,
  lockAfterBackgrounded: 2000,
  shouldClearVaultAfterTooManyFailedAttempts: true,
  customPasscodeInvalidUnlockAttempts: 2,
  unlockVaultOnLoad: true,
};
const key = "sessionData";

export interface VaultServiceState {
  session: string;
  isLocked: boolean;
  privacyScreen: boolean;
  lockType: "NoLocking" | "Biometrics" | "SystemPasscode";
  canUseBiometrics: boolean;
  canUsePasscode: boolean;
  vaultExists: boolean;
}

@Injectable({ providedIn: "root" })
export class VaultService {
  public state: VaultServiceState = {
    session: "",
    isLocked: false,
    privacyScreen: false,
    lockType: "SystemPasscode",
    canUseBiometrics: true,
    canUsePasscode: true,
    vaultExists: false,
  };

  vault: Vault | BrowserVault;

  constructor(private ngZone: NgZone) {
    this.vault =
      Capacitor.getPlatform() === "web"
        ? new BrowserVault(config)
        : new Vault(config);
    this.init();
  }

  async init() {


    this.vault.onLock(() => {
      console.log('Lock happened');
      this.ngZone.run(() => {
        this.state.isLocked = true;
        this.state.session = undefined;
      });
    });

    this.vault.onUnlock(() => {
      console.log('Unlock happened');
      this.ngZone.run(() => {
        this.state.isLocked = false;
      });
    });

    this.vault.onError((error) => {
      console.log('onError', JSON.stringify(error));
    });

    this.state.isLocked = await this.vault.isLocked();

    this.state.privacyScreen =
      Capacitor.getPlatform() === "web"
        ? false
        : await Device.isHideScreenOnBackgroundEnabled();
    this.state.canUseBiometrics =
      Capacitor.getPlatform() === "web"
        ? false
        : await Device.isBiometricsEnabled();
    this.state.canUsePasscode =
      Capacitor.getPlatform() === "web"
        ? false
        : await Device.isSystemPasscodeSet();
    this.state.vaultExists = !await this.vault.isEmpty();
  }

  async setSession(value: string): Promise<void> {
    console.log('Set data ', value);
    this.state.session = value;
    await this.vault.setValue(key, value);
    this.state.vaultExists = !await this.vault.isEmpty();
  }

  async restoreSession() {
    try {
      console.log('GetValue called for key ' + key);
      const value = await this.vault.getValue(key);
      console.log('GetValue returned ' + value);
      this.state.session = value;
    } catch (error) {
      console.error('GetValue failed', error);
    }

  }

  async lockVault() {
    console.log('Lock initiated');
    await this.vault.lock();
    console.log('Lock completed');
  }

  async unlockVault() {
    console.log('Unlock initiated');
    await this.vault.unlock();
    console.log('Unlock completed');
  }

  setPrivacyScreen(enabled: boolean) {
    Device.setHideScreenOnBackground(enabled);
    this.state.privacyScreen = enabled;
  }

  async setLockType() {
    let type: VaultType;
    let deviceSecurityType: DeviceSecurityType;

    switch (this.state.lockType) {
      case "Biometrics":
        type = VaultType.DeviceSecurity;
        deviceSecurityType = DeviceSecurityType.Biometrics;
        break;

      case "SystemPasscode":
        type = VaultType.DeviceSecurity;
        deviceSecurityType = DeviceSecurityType.SystemPasscode;
        break;

      default:
        type = VaultType.SecureStorage;
        deviceSecurityType = DeviceSecurityType.None;
    }
    // console.log('Clear vault');
    // await this.vault.clear();
    // console.log('Clear vault done');

    const startTime = performance.now();
    const newConfig = { ...this.vault.config, type, deviceSecurityType };
    console.log('updateConfig called to lock as ' + type + ' ' + deviceSecurityType, JSON.stringify(newConfig));
    await this.vault.updateConfig(newConfig);
    const endTime = performance.now();
    alert(`updateConfig took ${endTime - startTime} milliseconds`);
  }

  async clearVault() {
    await this.vault.clear();
    // this.state.lockType = "NoLocking";
    // this.state.session = undefined;
    // this.state.vaultExists = await this.vault.doesVaultExist();
  }
}
