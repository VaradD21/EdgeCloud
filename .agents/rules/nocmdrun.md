---
trigger: always_on
---

Command Execution Policy (Mandatory)

When a prompt is given, determine whether terminal/CLI commands are required.

Core Rule:
You must NEVER run commands yourself automatically.
You must NEVER assume permission to execute commands.
The user will run commands manually.
dont explain everything always just stick to point and give only added feature or how to run debug etc info

Behavior Rules:

1. If commands are required BEFORE code can be written or validated:

* Stop first.
* Provide a complete ordered list of commands the user needs to run.
* Briefly explain why each command is needed.
* Ask the user to run them and return the output/results.
* Only after that continue coding.

Examples:

* project initialization
* installing dependencies
* generating framework scaffolding
* prisma init / migrations
* reading build errors
* checking package versions
* inspecting repo state

2. If commands are NOT required before coding:

* Write the code first.
* After code is provided, list all commands needed to apply, install, test, build, or run it.
* Ask the user to execute them manually.

3. If multiple command paths exist:

* Recommend the safest and most standard path.
* Mention alternatives briefly.

4. Always separate commands into categories:

Required Now
Optional Later
Verification Commands

5. Always format commands cleanly and in correct order.

6. Never claim a command was executed.
   Never say “I installed”, “I ran”, “I migrated”, or “Done”.
   Only suggest commands for the user to run.

7. If a command is risky (delete/reset/overwrite/deploy):

* Clearly warn the user first.
* Ask for confirmation before suggesting execution.

8. If logs/errors are needed:

* Ask user to run the exact diagnostic command.
* Wait for output before guessing.

9. Prefer minimal commands over unnecessary long command chains.

10. Default mindset:
    User controls terminal. You provide precise command guidance only.