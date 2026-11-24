import glob
import os
import pathlib
import plistlib
import re
import subprocess
import sys

bundle = os.environ["BUNDLE_ID"]
folder = os.path.expanduser("~/Library/MobileDevice/Provisioning Profiles")
chosen = None
for profile in glob.glob(folder + "/*.mobileprovision"):
    raw = subprocess.check_output(["security", "cms", "-D", "-i", profile])
    data = plistlib.loads(raw)
    app_id = data.get("Entitlements", {}).get("application-identifier", "")
    if app_id.endswith("." + bundle):
        chosen = data
        break
if chosen is None:
    sys.exit("App Store profile for " + bundle + " was not found")

name = chosen["Name"].replace('"', "")
team = chosen["TeamIdentifier"][0]
uuid = chosen["UUID"]
print("Profile:", name)
print("Team:", team)

projects = list(pathlib.Path("ios").glob("*.xcodeproj/project.pbxproj"))
if not projects:
    sys.exit("Xcode project was not generated")
pbx = projects[0]
text = pbx.read_text()


def patch_block(block):
    if bundle not in block or "PRODUCT_BUNDLE_IDENTIFIER" not in block:
        return block
    if "CODE_SIGN_STYLE" in block:
        block = re.sub(r"CODE_SIGN_STYLE = [^;]+;", "CODE_SIGN_STYLE = Manual;", block)
    else:
        block = block.replace("buildSettings = {", "buildSettings = {\n\t\t\t\tCODE_SIGN_STYLE = Manual;", 1)

    def put(key, value):
        nonlocal block
        line = f"{key} = {value};"
        if key in block:
            block = re.sub(rf"{key} = [^;]+;", line, block)
        else:
            block = block.replace("CODE_SIGN_STYLE = Manual;", "CODE_SIGN_STYLE = Manual;\n\t\t\t\t" + line, 1)

    put("CODE_SIGN_IDENTITY", '"Apple Distribution"')
    put("DEVELOPMENT_TEAM", team)
    put("PROVISIONING_PROFILE_SPECIFIER", f'"{name}"')
    put("PROVISIONING_PROFILE", uuid)
    return block


pattern = re.compile(r"buildSettings = \{.*?\n[ \t]*\};", re.S)
updated = pattern.sub(lambda match: patch_block(match.group(0)), text)
if "PROVISIONING_PROFILE_SPECIFIER" not in updated:
    sys.exit("Could not attach the profile to the Xcode target")
updated = updated.replace("ProvisioningStyle = Automatic;", "ProvisioningStyle = Manual;")
pbx.write_text(updated)
print("Attached profile to", pbx)
