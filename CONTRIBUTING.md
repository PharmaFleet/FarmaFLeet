# Contributing to PharmaFleet

Thank you for contributing to the PharmaFleet project! We follow a structured development workflow to ensure code quality and stability.

## 🌿 Git Workflow

We follow a variation of **Gitflow**:

- **`main`**: Production-ready code. Deploys to Production.
- **`develop`**: Integration branch for features. Deploys to Staging.
- **`feature/name`**: New features. Branch off `develop`, merge back into `develop`.
- **`fix/issue`**: Bug fixes. Branch off `develop`, merge back into `develop`.
- **`hotfix/issue`**: Urgent production fixes. Branch off `main`, merge into `main` AND `develop`.

### Process
1.  **Clone the repo:** `git clone ...`
2.  **Checkout develop:** `git checkout develop`
3.  **Create feature branch:** `git checkout -b feature/my-cool-feature`
4.  **Commit changes:** (See conventions below)
5.  **Push:** `git push origin feature/my-cool-feature`
6.  **Open PR:** Create a Pull Request to merge `feature/...` into `develop`.

## 📝 Commit Message Conventions

We use **[Conventional Commits](https://www.conventionalcommits.org/)** to automate versioning and changelogs.

**Format:** `<type>(<scope>): <subject>`

### Types
- **`feat`**: A new feature
- **`fix`**: A bug fix
- **`docs`**: Documentation only changes
- **`style`**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **`refactor`**: A code change that neither fixes a bug nor adds a feature
- **`perf`**: A code change that improves performance
- **`test`**: Adding missing tests or correcting existing tests
- **`chore`**: Changes to the build process or auxiliary tools and libraries

**Examples:**
- `feat(auth): implement jwt login endpoint`
- `fix(mobile): resolve crash on offline mode switch`
- `docs(readme): update setup instructions`

## 🚀 Pull Request Process

1.  Ensure your code passes all local tests and linting.
2.  Update `README.md` or documentation if you changed how things work.
3.  Fill out the **Pull Request Template** completely.
4.  Request a review from at least one other team member.
5.  Once approved and CI passes, squash and merge.
