<script lang="ts">
	import { base } from '$app/paths';
</script>

<h1 class="sr-only">Карта</h1>

<div class="map">
	<div class="card state">
		<div class="state-icon" aria-hidden="true">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path
					d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"
				/>
				<path d="M15 5.764v15" />
				<path d="M9 3.236v15" />
			</svg>
		</div>
		<div class="state-title">Карта — в следующей версии</div>
		<div class="state-text">Интерактивная карта погоды и осадков появится во второй версии приложения.</div>
		<a class="primary-btn" href={base + '/'}>На главную</a>
	</div>
</div>

<style>
	.map {
		display: grid;
		place-items: center;
		padding-top: var(--space-7);
	}

	.state {
		width: 100%;
		max-width: 360px;
		padding: var(--space-7) var(--space-5);
		text-align: center;
	}

	.state-icon {
		display: grid;
		place-items: center;
		width: 84px;
		height: 84px;
		margin: 0 auto var(--space-4);
		border-radius: 50%;
		background: rgba(59, 130, 246, 0.1);
		color: var(--accent);
	}

	.state-icon svg {
		width: 40px;
		height: 40px;
	}

	.state-title {
		font-size: 17px;
		font-weight: 600;
	}

	.state-text {
		color: var(--text-secondary);
		font-size: 15px;
		margin-top: var(--space-1);
		margin-bottom: var(--space-5);
	}

	.primary-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0 var(--space-4);
		border: none;
		border-radius: var(--radius-control);
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		text-decoration: none;
	}

	.primary-btn:active {
		opacity: 0.85;
	}
</style>
