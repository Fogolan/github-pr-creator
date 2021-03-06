(async function() {
	const config = require("config");

	const {
		name,
		email,
		commitMessage,
		remoteName,
		pullRequest: { title, body, head, base },
		github: { login, pass, token }
	} = config;

	const { Repository, Reference, Signature, Cred } = require("nodegit");
	const client = require("octonode").client(token);

	const ghrepo = client.repo("Fogolan/github-pr-creator");

	const repository = await Repository.open("./");
	const index = await repository.index();

	await index.addAll("*");
	await index.write();
	const oid = await index.writeTree();

	const commitHead = await Reference.nameToId(repository, "HEAD");
	const parent = await repository.getCommit(commitHead);

	const author = Signature.create(name, email, new Date().getTime(), 60);
	var committer = Signature.create(name, email, new Date().getTime(), 90);

	const commitId = await repository.createCommit(
		"HEAD",
		author,
		committer,
		commitMessage,
		oid,
		[parent]
	);

	const remote = await repository.getRemote(remoteName);

	await remote.push(["refs/heads/develop:refs/heads/develop"], {
		callbacks: {
			certificateCheck: () => 1,
			credentials: (url, userName) => {
				console.log(`getting creds for url:${url} username:${userName}`);

				return Cred.userpassPlaintextNew(login, pass);
			}
		}
	});

	ghrepo.pr(
		{
			title,
			body,
			head,
			base
		},
		(err, inf) => {
			if (err) {
				console.log(err);
				return;
			}

			console.log(inf);
		}
	);
})();
