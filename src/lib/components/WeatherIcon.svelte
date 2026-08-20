<script lang="ts">
	import { base } from '$app/paths';

	interface Props {
		name: string;
		size?: number;
		class?: string;
	}

	let { name, size = 32, class: className }: Props = $props();
</script>

<img
	class={className}
	src={`${base}/icons/weather/${name}.svg`}
	width={size}
	height={size}
	alt=""
	aria-hidden="true"
/>